"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Check } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { toggleCheckInAction, bulkCheckInAction } from "./actions";

type ParticipantRow = {
  countMeInId: string;
  name: string;
  roll: string;
  checkedIn: boolean;
  image?: string | null;
};

function exportCsv(eventSlug: string, rows: ParticipantRow[]) {
  const header = "Participant,Roll,Check-in\n";
  const body = rows.map((r) => `${r.name},${r.roll},${r.checkedIn ? "Checked in" : "Not checked in"}`).join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${eventSlug}-participants.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ParticipantList({
  eventId,
  eventSlug,
  rows,
}: {
  eventId: string;
  eventSlug: string;
  rows: ParticipantRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const notCheckedInIds = useMemo(() => rows.filter((r) => !r.checkedIn).map((r) => r.countMeInId), [rows]);
  const allNotCheckedInSelected = notCheckedInIds.length > 0 && notCheckedInIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggle(countMeInId: string) {
    startTransition(async () => {
      await toggleCheckInAction(countMeInId, eventSlug);
    });
  }

  function toggleSelected(countMeInId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(countMeInId)) next.delete(countMeInId);
      else next.add(countMeInId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allNotCheckedInSelected ? new Set() : new Set(notCheckedInIds));
  }

  function checkInSelected() {
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkCheckInAction(eventId, ids, eventSlug);
      setSelected(new Set());
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-5">
        <div className="text-mono-label">Participant list</div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <Btn size="sm" variant="primary" disabled={pending} onClick={checkInSelected}>
              <Check className="h-4 w-4" /> Check in selected ({selected.size})
            </Btn>
          )}
          <Btn size="sm" variant="outline" onClick={() => exportCsv(eventSlug, rows)}>
            <Download className="h-4 w-4" /> Export list
          </Btn>
        </div>
      </div>
      <div className="hidden grid-cols-[28px_2fr_140px_130px] items-center gap-4 border-b border-hairline px-6 py-3 text-mono-label md:grid">
        <input
          type="checkbox"
          aria-label="Select all not checked in"
          checked={allNotCheckedInSelected}
          disabled={notCheckedInIds.length === 0}
          onChange={toggleSelectAll}
          className="h-4 w-4 accent-primary"
        />
        <div>Participant</div>
        <div>Roll</div>
        <div>Check-in</div>
      </div>
      <div className="divide-y divide-hairline">
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No registrations yet.</div>}
        {rows.map((r) => (
          <div key={r.countMeInId}>
            <div className="p-4 md:hidden">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${r.name}`}
                  checked={selected.has(r.countMeInId)}
                  disabled={r.checkedIn}
                  onChange={() => toggleSelected(r.countMeInId)}
                  className="h-4 w-4 accent-primary"
                />
                <Avatar name={r.name} image={r.image} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  <div className="text-mono-label !normal-case !tracking-normal text-xs">{r.roll}</div>
                </div>
              </div>
              <Btn
                size="sm"
                variant={r.checkedIn ? "primary" : "outline"}
                disabled={pending}
                onClick={() => toggle(r.countMeInId)}
                className="mt-3 w-full"
              >
                {r.checkedIn ? <><Check className="h-3.5 w-3.5" /> Checked in</> : "Check in"}
              </Btn>
            </div>
            <div className="hidden grid-cols-[28px_2fr_140px_130px] items-center gap-4 px-6 py-4 md:grid">
              <input
                type="checkbox"
                aria-label={`Select ${r.name}`}
                checked={selected.has(r.countMeInId)}
                disabled={r.checkedIn}
                onChange={() => toggleSelected(r.countMeInId)}
                className="h-4 w-4 accent-primary"
              />
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={r.name} image={r.image} size="sm" />
                <div className="truncate text-sm font-medium">{r.name}</div>
              </div>
              <div className="text-mono-label !normal-case !tracking-normal text-xs">{r.roll}</div>
              <Btn
                size="sm"
                variant={r.checkedIn ? "primary" : "outline"}
                disabled={pending}
                onClick={() => toggle(r.countMeInId)}
                className="w-fit"
              >
                {r.checkedIn ? <><Check className="h-3.5 w-3.5" /> Checked in</> : "Check in"}
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
