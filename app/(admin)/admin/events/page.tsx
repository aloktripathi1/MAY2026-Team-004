import type { Metadata } from "next";
import { requirePageMembership } from "@/backend/auth/page-session";
import { PageHeader } from "@/components/shell/AppShell";
import { NewEventModal } from "@/components/coordinator/NewEventModal";
import { EventsListView } from "@/components/coordinator/EventsListView";

export const metadata: Metadata = {
  title: "Events · Sangam",
  description: "Events hosted by your club.",
};

/**
 * Admin's native events page — same EventsListView + NewEventModal the
 * Coordinator surface uses (components/coordinator/), just mounted under the
 * Admin shell so an Admin never has to leave it to manage events. An Admin
 * already outranks Coordinator here (SURFACE_ROLES), so "Admin" is the
 * correct page-membership gate, not "Coordinator".
 */
export default async function AdminEventsPage() {
  const { membership } = await requirePageMembership("Admin");

  return (
    <>
      <PageHeader
        title={<>All <span className="text-secondary">events.</span></>}
        description="Full history and records of events hosted by your club."
        actions={<NewEventModal />}
      />
      <EventsListView clubId={membership.clubId} basePath="/admin" layout="grid" />
    </>
  );
}
