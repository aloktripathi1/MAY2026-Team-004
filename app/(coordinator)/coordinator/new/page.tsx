import type { Metadata } from "next";
import { requirePageMembership } from "@/backend/auth/page-session";
import { PageHeader } from "@/components/shell/AppShell";
import { NewEventModal } from "@/components/coordinator/NewEventModal";
import { EventsListView } from "@/components/coordinator/EventsListView";

export const metadata: Metadata = {
  title: "All Events · Sangam",
  description: "Full history and past records of events.",
};

export default async function AllEventsPage() {
  const { membership } = await requirePageMembership("Coordinator");

  return (
    <>
      <PageHeader
        title={<>All <span className="text-secondary">events.</span></>}
        description="Full history and records of events hosted by your club."
        actions={<NewEventModal />}
      />
      <EventsListView clubId={membership.clubId} />
    </>
  );
}
