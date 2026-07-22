"use client";

import { useTransition } from "react";
import { Download, Check } from "lucide-react";
import { Btn, StatusPill } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { toggleCheckInAction } from "./actions";

type ParticipantRow = {
  rsvpId: string;
  name: string;
  roll: string;
  checkedIn: boolean;
  image?: string | null;
};

function exportCsv(eventSlug: string, rows: ParticipantRow[]) {
  const header = "Participant,Roll,RSVP,Check-in\n";
  const body = rows.map((r) => `${r.name},${r.roll},Confirmed,${r.checkedIn ? "Checked in" : "Not checked in"}`).join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${eventSlug}-participants.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ParticipantList({ eventSlug, rows }: { eventSlug: string; rows: ParticipantRow[] }) {
  const [pending, startTransition] = useTransition();

  function toggle(rsvpId: string) {
    startTransition(async () => {
      await toggleCheckInAction(rsvpId, eventSlug);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-hairline p-5">
        <div className="text-mono-label">Participant list</div>
        <Btn size="sm" variant="outline" onClick={() => exportCsv(eventSlug, rows)}>
          <Download className="h-4 w-4" /> Export list
        </Btn>
      </div>
      <div className="grid grid-cols-[1fr_120px_100px_110px] gap-4 border-b border-hairline px-6 py-3 text-mono-label md:grid-cols-[2fr_140px_120px_130px]">
        <div>Participant</div>
        <div>Roll</div>
        <div>RSVP</div>
        <div>Check-in</div>
      </div>
      <div className="divide-y divide-hairline">
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No registrations yet.</div>}
        {rows.map((r) => (
          <div key={r.rsvpId} className="grid grid-cols-[1fr_120px_100px_110px] items-center gap-4 px-6 py-4 md:grid-cols-[2fr_140px_120px_130px]">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={r.name} image={r.image} size="sm" />
              <div className="truncate text-sm font-medium">{r.name}</div>
            </div>
            <div className="text-mono-label !normal-case !tracking-normal text-xs">{r.roll}</div>
            <StatusPill tone="green">Confirmed</StatusPill>
            <Btn
              size="sm"
              variant={r.checkedIn ? "primary" : "outline"}
              disabled={pending}
              onClick={() => toggle(r.rsvpId)}
              className="w-fit"
            >
              {r.checkedIn ? <><Check className="h-3.5 w-3.5" /> Checked in</> : "Check in"}
            </Btn>
          </div>
        ))}
      </div>
    </>
  );
}
