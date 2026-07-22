"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/AppShell";
import { NewAnnouncementButton } from "./announcements/AnnouncementDialog";
import { AnnouncementDialog } from "./announcements/AnnouncementDialog";

export function AdminPageHeader({ clubName, memberCount }: { clubName: string; memberCount: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={<>{clubName ?? "Your club"}</>}
        actions={<NewAnnouncementButton onClick={() => setDialogOpen(true)} />}
      />
      <AnnouncementDialog open={dialogOpen} onClose={() => setDialogOpen(false)} memberCount={memberCount} />
    </>
  );
}
