import { getAuthCookieUserId, type SessionMembership } from "@/backend/auth/session-cookies";
import { getCurrentUserById } from "@/backend/auth/get-current-user";

export type { SessionMembership };

// The demo account (id "u1") holds all four club roles at once so QA can switch
// personas without logging in as different people. Each role still displays as
// a distinct, real seed member so the sidebar doesn't show "Ananya Rao" for
// every persona — the underlying session id/data-ownership stays the same
// (see the comment on `id` below), only the displayed name differs per role.
const demoMemberships: SessionMembership[] = [
  { clubId: "c1", clubSlug: "codechef", clubName: "CodeChef IITM BS", role: "Admin", personaName: "Ananya Rao" },
  { clubId: "c6", clubSlug: "e-cell", clubName: "E-Cell IITM BS", role: "Coordinator", personaName: "Kabir Menon" },
  { clubId: "c3", clubSlug: "sarga", clubName: "Sarga - Music Circle", role: "Volunteer", personaName: "Ishita Deshpande" },
  { clubId: "c2", clubSlug: "paradox", clubName: "Paradox - Debate Society", role: "Member", personaName: "Ananya Rao" },
];

/**
 * The privileged demo persona is a local/dev convenience only (lets the login
 * page's "preview a role" buttons work without a real account). It must
 * never activate in production and must never be the reason an
 * unauthenticated or tampered request is treated as authorized — see #81/#72.
 */
function demoSessionAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_DEMO_SESSION === "true";
}

/**
 * Resolves the current session strictly from the signed session cookie:
 * verifies the signature, then loads name/email/role/memberships fresh from
 * the database (never from client-supplied cookie data). Returns null for
 * missing or tampered cookies — callers must redirect to /login or respond
 * 401, they must NOT treat null as "use the demo persona" except via the
 * explicit, gated fallback below.
 */
export async function getMockSession() {
  const userId = getAuthCookieUserId();

  if (userId) {
    const result = await getCurrentUserById(userId);
    if (!result.ok) return null;

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        isFaculty: result.user.isFaculty,
        memberships: result.user.memberships,
      },
      expires: "2099-12-31T23:59:59.999Z",
    };
  }

  if (demoSessionAllowed()) {
    return {
      user: {
        // Must match the demo user id from prisma seed (member "m1" -> "u1").
        id: "u1",
        name: "Ananya Rao",
        email: "23s1000123@ds.study.iitm.ac.in",
        isFaculty: true,
        memberships: demoMemberships,
      },
      expires: "2099-12-31T23:59:59.999Z",
    };
  }

  return null;
}
