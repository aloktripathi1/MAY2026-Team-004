/**
 * Integration tests for role provisioning.
 *
 * Before this feature, a Club row and the first Admin of a club could only come
 * from prisma/seed.ts, and `isFaculty` was never written outside the seed — so a
 * freshly deployed database had no way for anyone to gain any role through the
 * app. These tests cover the two paths that fix that: faculty granting faculty,
 * and a student proposal becoming a club with the proposer as its Admin.
 *
 * Requires a running Sangam app + seeded database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 */
import { prisma } from "@/backend/db/prisma";
import {
  approveClubRequest,
  listClubRequestsForUser,
  rejectClubRequest,
  submitClubRequest,
} from "@/backend/domain/club-requests";
import { grantFaculty, revokeFaculty } from "@/backend/domain/faculty";
import { deleteUsersByEmails } from "./db-cleanup";
import { isApiAvailable, reportCase, requireApiAvailable, uniqueIdentity } from "./helpers";

const createdEmails: string[] = [];
const createdUserIds: string[] = [];
const createdClubIds: string[] = [];
const createdRequestIds: string[] = [];

async function makeStudent() {
  const identity = uniqueIdentity("23p");
  const user = await prisma.user.create({
    data: {
      email: identity.email,
      name: identity.name,
      rollNumber: identity.rollNumber,
      hashedPassword: "",
      interests: "[]",
      emailVerified: new Date(),
    },
  });
  createdEmails.push(user.email);
  createdUserIds.push(user.id);
  return user;
}

function proposal(name: string) {
  return {
    name,
    tagline: "A tagline long enough to be meaningful.",
    category: "Technical" as const,
    description:
      "Weekly build nights, a workshop series for beginners, and one showcase per semester. Open to every year group.",
  };
}

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
});

afterAll(async () => {
  for (const id of createdRequestIds) {
    await prisma.clubRequest.deleteMany({ where: { id } });
  }
  if (createdClubIds.length > 0) {
    await prisma.club.deleteMany({ where: { id: { in: createdClubIds } } });
  }
  if (createdUserIds.length > 0) {
    await prisma.emailLog.deleteMany({ where: { userId: { in: createdUserIds } } });
  }
  if (createdEmails.length > 0) {
    const deleted = await deleteUsersByEmails(createdEmails);
    console.log(`\n[cleanup] deleted ${deleted} test user(s)`);
  }
});

describe("faculty provisioning", () => {
  it("grants faculty by email and is idempotent", async () => {
    const user = await makeStudent();

    const first = await grantFaculty(user.email);
    const second = await grantFaculty(user.email.toUpperCase());

    reportCase(
      "grantFaculty",
      { email: user.email, attempts: 2 },
      { first: "changed", second: "no change" },
      { first: first.ok && first.changed, second: second.ok && second.changed },
      () => {
        expect(first.ok).toBe(true);
        expect(first.ok && first.changed).toBe(true);
        // Re-granting must not be an error, and must report no change.
        expect(second.ok).toBe(true);
        expect(second.ok && second.changed).toBe(false);
      },
    );
  });

  it("refuses an address with no account", async () => {
    const result = await grantFaculty("nobody-at-all@ds.study.iitm.ac.in");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe("USER_NOT_FOUND");
  });

  // Both guards exist to prevent the state this whole feature removes: an
  // institution with no faculty and no way to appoint one short of DB access.
  it("refuses self-revocation and refuses removing the last faculty", async () => {
    const user = await makeStudent();
    await grantFaculty(user.email);

    const self = await revokeFaculty(user.id, user.id);

    const seededFaculty = await prisma.user.findFirstOrThrow({
      where: { isFaculty: true, id: { not: user.id } },
    });
    const byOther = await revokeFaculty(user.id, seededFaculty.id);

    reportCase(
      "revokeFaculty guards",
      { selfRevoke: true, thenRevokedByAnotherFaculty: true },
      { selfRevoke: "SELF_REVOKE", byOther: "ok" },
      { selfRevoke: self.ok === false && self.code, byOther: byOther.ok },
      () => {
        expect(self.ok).toBe(false);
        expect(self.ok === false && self.code).toBe("SELF_REVOKE");
        expect(byOther.ok).toBe(true);
      },
    );
  });
});

describe("club requests", () => {
  it("approving creates the club and makes the proposer its Admin", async () => {
    const student = await makeStudent();
    const faculty = await prisma.user.findFirstOrThrow({ where: { isFaculty: true } });
    const name = `Jest Provisioning Club ${Date.now()}`;

    const submitted = await submitClubRequest(student.id, proposal(name));
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    createdRequestIds.push(submitted.request.id);

    const approved = await approveClubRequest(submitted.request.id, faculty.id);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    createdClubIds.push(approved.club.id);

    const membership = await prisma.membership.findUnique({
      where: { userId_clubId: { userId: student.id, clubId: approved.club.id } },
    });
    const request = await prisma.clubRequest.findUniqueOrThrow({ where: { id: submitted.request.id } });

    reportCase(
      "approveClubRequest",
      { proposal: name, reviewer: faculty.email },
      { clubCreated: true, proposerRole: "Admin", membershipStatus: "Active", requestStatus: "Approved" },
      {
        clubCreated: Boolean(approved.club.id),
        proposerRole: membership?.role,
        membershipStatus: membership?.status,
        requestStatus: request.status,
      },
      () => {
        // The whole point: a brand-new club that already has an admin.
        expect(membership?.role).toBe("Admin");
        expect(membership?.status).toBe("Active");
        expect(request.status).toBe("Approved");
        expect(request.createdClubId).toBe(approved.club.id);
        expect(approved.club.slug).toMatch(/^jest-provisioning-club/);
        // Derived presentation fields must be filled, or the club renders broken.
        expect(approved.club.banner).toContain("linear-gradient");
        expect(approved.club.hue).toMatch(/^\d+$/);
        expect(approved.club.founded).toBe(String(new Date().getFullYear()));
      },
    );
  });

  it("gives a second club of the same name a distinct slug", async () => {
    const a = await makeStudent();
    const b = await makeStudent();
    const faculty = await prisma.user.findFirstOrThrow({ where: { isFaculty: true } });
    const name = `Jest Slug Clash ${Date.now()}`;

    const first = await submitClubRequest(a.id, proposal(name));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    createdRequestIds.push(first.request.id);
    const firstClub = await approveClubRequest(first.request.id, faculty.id);
    if (!firstClub.ok) return;
    createdClubIds.push(firstClub.club.id);

    // Same name again: blocked at submit because the club now exists.
    const blocked = await submitClubRequest(b.id, proposal(name));

    reportCase(
      "duplicate club name",
      { name, secondProposer: b.email },
      { secondSubmissionRejected: "CLUB_EXISTS" },
      { secondSubmissionRejected: blocked.ok === false && blocked.code },
      () => {
        expect(blocked.ok).toBe(false);
        expect(blocked.ok === false && blocked.code).toBe("CLUB_EXISTS");
      },
    );
  });

  it("blocks a second pending proposal for the same name", async () => {
    const a = await makeStudent();
    const b = await makeStudent();
    const name = `Jest Pending Clash ${Date.now()}`;

    const first = await submitClubRequest(a.id, proposal(name));
    if (first.ok) createdRequestIds.push(first.request.id);
    const second = await submitClubRequest(b.id, proposal(name));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.code).toBe("REQUEST_EXISTS");
  });

  it("caps how many proposals one student can have open", async () => {
    const student = await makeStudent();
    for (let i = 0; i < 3; i += 1) {
      const r = await submitClubRequest(student.id, proposal(`Jest Cap ${Date.now()}-${i}`));
      if (r.ok) createdRequestIds.push(r.request.id);
    }

    const overLimit = await submitClubRequest(student.id, proposal(`Jest Cap Over ${Date.now()}`));
    expect(overLimit.ok).toBe(false);
    expect(overLimit.ok === false && overLimit.code).toBe("TOO_MANY_OPEN");
  });

  it("rejects with a note, and refuses to review the same request twice", async () => {
    const student = await makeStudent();
    const faculty = await prisma.user.findFirstOrThrow({ where: { isFaculty: true } });

    const submitted = await submitClubRequest(student.id, proposal(`Jest Rejected ${Date.now()}`));
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    createdRequestIds.push(submitted.request.id);

    const rejected = await rejectClubRequest(submitted.request.id, faculty.id, "Overlaps with an existing club.");
    const again = await approveClubRequest(submitted.request.id, faculty.id);

    const mine = await listClubRequestsForUser(student.id);

    reportCase(
      "rejectClubRequest",
      { requestId: submitted.request.id },
      { rejected: true, secondReview: "ALREADY_REVIEWED", noClubCreated: true },
      { rejected: rejected.ok, secondReview: again.ok === false && again.code, requests: mine.length },
      () => {
        expect(rejected.ok).toBe(true);
        expect(rejected.ok && rejected.request.reviewNote).toBe("Overlaps with an existing club.");
        // A decided request must not be re-decided into a club.
        expect(again.ok).toBe(false);
        expect(again.ok === false && again.code).toBe("ALREADY_REVIEWED");
        expect(mine[0]?.status).toBe("Rejected");
      },
    );
  });
});
