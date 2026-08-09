import type { Metadata } from "next";
import { requirePageMembership } from "@/backend/auth/page-session";
import { PageHeader } from "@/components/shell/AppShell";
import { VolunteersView } from "@/components/coordinator/VolunteersView";

export const metadata: Metadata = {
  title: "Volunteers · Sangam",
  description: "Assign and track volunteer tasks.",
};

/**
 * Admin's native volunteers/task-assignment page — same VolunteersView the
 * Coordinator surface uses, mounted under the Admin shell. See
 * app/(admin)/admin/events/page.tsx for why "Admin" is the right gate here.
 */
export default async function AdminVolunteersPage() {
  const { membership } = await requirePageMembership("Admin");

  return (
    <>
      <PageHeader title={<>Volunteers <span className="text-secondary">on deck.</span></>} description="Assign tasks inline, update status as work moves through the board." />
      <VolunteersView clubId={membership.clubId} />
    </>
  );
}
