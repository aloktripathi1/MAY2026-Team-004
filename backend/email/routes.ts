import { absoluteUrl } from "@/backend/email/config";
import { unsubscribeUrl } from "@/backend/email/unsubscribe";
import type { EmailCategory } from "@/lib/notification-prefs";

/**
 * Every in-app destination an email links to, in one place. Emails are the one
 * surface where a wrong path is invisible until a recipient clicks it, so these
 * are named rather than string-built at each call site.
 *
 * Member event pages are addressed by slug (see the revalidatePath calls in
 * backend/domain/countMeIn.ts), not id.
 */
export const emailLinks = {
  app: () => absoluteUrl("/app"),
  clubs: () => absoluteUrl("/app/clubs"),
  events: () => absoluteUrl("/app/events"),
  event: (slug: string) => absoluteUrl(`/app/events/${slug}`),
  issues: () => absoluteUrl("/app/issues"),
  profile: () => absoluteUrl("/app/profile"),
  verify: (token: string) => absoluteUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
  adminDashboard: () => absoluteUrl("/admin"),
  adminApprovals: () => absoluteUrl("/admin/approvals"),
  adminIssues: () => absoluteUrl("/admin/issues"),
  coordinatorEvent: (slug: string) => absoluteUrl(`/coordinator/events/${slug}`),
  facultyApprovals: () => absoluteUrl("/faculty/approvals"),
  facultyDashboard: () => absoluteUrl("/faculty"),
  facultyClubRequests: () => absoluteUrl("/faculty/club-requests"),
  volunteerTasks: () => absoluteUrl("/volunteer"),
};

/** The footer "change what Sangam emails you" link for one recipient. */
export function manageUrlFor(userId: string, category: EmailCategory): string {
  return unsubscribeUrl({ userId, category });
}
