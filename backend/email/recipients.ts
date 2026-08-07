import type { AnnouncementAudience, ClubRole } from "@prisma/client";
import { prisma } from "@/backend/db/prisma";

/**
 * Who gets a given email. Kept apart from the templates and the client so the
 * "which humans" question is testable on its own — it's the part most likely to
 * be wrong in a way nobody notices until someone is over-notified.
 *
 * Only `Active` memberships are ever mailed. Pending applicants haven't been
 * approved yet and Inactive members have left; neither should receive club mail.
 */

export type Recipient = {
  userId: string;
  email: string;
  name: string;
  prefsJson: string;
  role: ClubRole;
};

/**
 * Role tiers per announcement audience. A club Admin is accountable for what
 * coordinators and volunteers are told, so higher tiers are included rather
 * than excluded — otherwise the person who posted a "Volunteers" announcement
 * is the only one who never sees it land.
 */
export const AUDIENCE_ROLES: Record<AnnouncementAudience, ClubRole[]> = {
  All: ["Member", "Volunteer", "Coordinator", "Admin"],
  Coordinators: ["Coordinator", "Admin"],
  Volunteers: ["Volunteer", "Coordinator", "Admin"],
};

function toRecipient(m: {
  userId: string;
  role: ClubRole;
  user: { email: string; name: string; notificationPrefs: string };
}): Recipient {
  return {
    userId: m.userId,
    email: m.user.email,
    name: m.user.name,
    prefsJson: m.user.notificationPrefs,
    role: m.role,
  };
}

const USER_SELECT = { select: { email: true, name: true, notificationPrefs: true } } as const;

/** Active members of a club, optionally narrowed to an announcement audience. */
export async function clubRecipients(
  clubId: string,
  audience: AnnouncementAudience = "All",
): Promise<Recipient[]> {
  const memberships = await prisma.membership.findMany({
    where: { clubId, status: "Active", role: { in: AUDIENCE_ROLES[audience] } },
    include: { user: USER_SELECT },
  });
  return memberships.map(toRecipient);
}

/** Active club members matching explicit user ids (targeted announcements). */
export async function clubMemberRecipientsByIds(
  clubId: string,
  userIds: string[],
): Promise<Recipient[]> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return [];
  const memberships = await prisma.membership.findMany({
    where: { clubId, status: "Active", userId: { in: unique } },
    include: { user: USER_SELECT },
  });
  return memberships.map(toRecipient);
}

/** Active admins of a club — the people who action approval requests. */
export async function clubAdminRecipients(clubId: string): Promise<Recipient[]> {
  const memberships = await prisma.membership.findMany({
    where: { clubId, status: "Active", role: "Admin" },
    include: { user: USER_SELECT },
  });
  return memberships.map(toRecipient);
}

/** Everyone registered for an event (`CountMeIn`), for reminders and changes. */
export async function eventRegistrantRecipients(eventId: string): Promise<Recipient[]> {
  const countMeIns = await prisma.countMeIn.findMany({
    where: { eventId },
    include: { user: USER_SELECT },
  });
  return countMeIns.map((c) => ({
    userId: c.userId,
    email: c.user.email,
    name: c.user.name,
    prefsJson: c.user.notificationPrefs,
    role: "Member" as ClubRole,
  }));
}

/**
 * Faculty reviewers. Faculty aren't club-scoped (see the comment on
 * facultySetEventApprovalAction), so every faculty account is a reviewer.
 */
export async function facultyRecipients(): Promise<Recipient[]> {
  const users = await prisma.user.findMany({
    where: { isFaculty: true },
    select: { id: true, email: true, name: true, notificationPrefs: true },
  });
  return users.map((u) => ({
    userId: u.id,
    email: u.email,
    name: u.name,
    prefsJson: u.notificationPrefs,
    role: "Member" as ClubRole,
  }));
}

/** A single user as a recipient, or null if they no longer exist. */
export async function userRecipient(userId: string): Promise<Recipient | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, notificationPrefs: true },
  });
  if (!user) return null;
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    prefsJson: user.notificationPrefs,
    role: "Member",
  };
}

/** Drops duplicate people from a merged list (e.g. admins who are also members). */
export function dedupeRecipients(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  return recipients.filter((r) => {
    const key = r.userId || r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Removes one person from a list — usually the actor who caused the event. */
export function excludeUser(recipients: Recipient[], userId: string | null | undefined): Recipient[] {
  if (!userId) return recipients;
  return recipients.filter((r) => r.userId !== userId);
}
