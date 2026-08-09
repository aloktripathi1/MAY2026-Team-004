"use client";

import { useState } from "react";
import Link from "next/link";
import { Users2 } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { Btn } from "@/components/ui/primitives";
import { NewEventModal } from "@/components/coordinator/NewEventModal";
import { NewAnnouncementButton } from "./announcements/AnnouncementDialog";
import { AnnouncementDialog } from "./announcements/AnnouncementDialog";

export function AdminPageHeader({ clubName, memberCount }: { clubName: string; memberCount: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={<>{clubName ?? "Your club"}</>}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            {/* Reuses the Coordinator's own event-creation UI — an Admin
                already outranks Coordinator on this surface (SURFACE_ROLES),
                so this is the same modal, not a duplicate implementation. */}
            <NewEventModal variant="outline" size="sm" label="New event" className="w-full sm:w-auto" />
            <Link href="/admin/volunteers" className="block w-full sm:inline-block sm:w-auto">
              <Btn variant="outline" size="sm" className="w-full sm:w-auto">
                <Users2 className="h-4 w-4" /> Volunteers &amp; tasks
              </Btn>
            </Link>
            <NewAnnouncementButton
              onClick={() => setDialogOpen(true)}
              className="col-span-2 w-full sm:col-span-1 sm:w-auto"
            />
          </div>
        }
      />
      <AnnouncementDialog open={dialogOpen} onClose={() => setDialogOpen(false)} memberCount={memberCount} />
    </>
  );
}
