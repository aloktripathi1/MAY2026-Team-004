import type { Metadata } from "next";
import { requirePageMembership } from "@/backend/auth/page-session";
import { EventDetailView } from "@/components/coordinator/EventDetailView";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `Event dashboard · Sangam`, description: "Manage this event." };
}

/**
 * Admin's native single-event dashboard — same EventDetailView the
 * Coordinator surface uses, mounted under the Admin shell. See
 * app/(admin)/admin/events/page.tsx for why "Admin" is the right gate here.
 */
export default async function AdminEventDashboard({ params }: { params: { id: string } }) {
  const { membership } = await requirePageMembership("Admin");
  return <EventDetailView slugOrId={params.id} clubId={membership.clubId} />;
}
