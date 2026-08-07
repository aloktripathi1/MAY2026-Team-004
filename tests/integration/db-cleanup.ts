import { prisma } from "@/backend/db/prisma";

/** Deletes users (and cascaded rows) matching the given emails. Returns the count deleted. */
export async function deleteUsersByEmails(emails: string[]): Promise<number> {
  const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (normalized.length === 0) return 0;
  const result = await prisma.user.deleteMany({ where: { email: { in: normalized } } });
  return result.count;
}

/** Deletes events (and cascaded Task/Contribution/CountMeIn rows) created during a test. */
export async function deleteEventsByIds(eventIds: string[]): Promise<number> {
  const ids = [...new Set(eventIds.filter(Boolean))];
  if (ids.length === 0) return 0;
  const result = await prisma.event.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

/** Deletes memberships created during a test (e.g. join requests). */
export async function deleteMembershipsByIds(membershipIds: string[]): Promise<number> {
  const ids = [...new Set(membershipIds.filter(Boolean))];
  if (ids.length === 0) return 0;
  const result = await prisma.membership.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

/** Deletes announcements by id (e.g. Ask Sangam / domain integration fixtures). */
export async function deleteAnnouncementsByIds(announcementIds: string[]): Promise<number> {
  const ids = [...new Set(announcementIds.filter(Boolean))];
  if (ids.length === 0) return 0;
  const result = await prisma.announcement.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

/** Deletes tasks by id without touching their parent events. */
export async function deleteTasksByIds(taskIds: string[]): Promise<number> {
  const ids = [...new Set(taskIds.filter(Boolean))];
  if (ids.length === 0) return 0;
  const result = await prisma.task.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}
