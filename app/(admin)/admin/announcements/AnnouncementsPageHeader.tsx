"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/AppShell";
import { NewAnnouncementButton, AnnouncementDialog } from "./AnnouncementDialog";

export function AnnouncementsPageHeader({ memberCount }: { memberCount: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={<>Announcement <span className="text-secondary">History</span></>}
        description="View all past announcements sent to your club members."
        actions={<NewAnnouncementButton onClick={() => setDialogOpen(true)} />}
      />
      <AnnouncementDialog open={dialogOpen} onClose={() => setDialogOpen(false)} memberCount={memberCount} />
    </>
  );
}
