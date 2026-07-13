"use client";

import { useEffect, useRef, useState } from "react";
import { ListFilter } from "lucide-react";
import { Btn, GlassCard, StatusPill } from "@/components/ui/primitives";
import { formatIssueStatus } from "@/lib/format";
import { IssueForm } from "./IssueForm";

export type IssueRow = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  raisedByName: string;
  attachments?: string[];
};

const ISSUE_STATUSES = ["Open", "InProgress", "Resolved"] as const;

function priorityTone(priority: string): "magenta" | "amber" | "slate" {
  if (priority === "High") return "magenta";
  if (priority === "Med") return "amber";
  return "slate";
}

function statusTone(status: string): "green" | "amber" | "magenta" {
  if (status === "Resolved") return "green";
  if (status === "InProgress") return "amber";
  return "magenta";
}

function IssueFilter({
  selected,
  onChange,
}: {
  selected: string | null;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Btn
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <ListFilter className="h-4 w-4" />
        Filter
        {selected && (
          <span className="font-mono text-[11px] text-secondary">{formatIssueStatus(selected)}</span>
        )}
      </Btn>
      {open && (
        <div
          role="dialog"
          aria-label="Filter issues"
          className="night-nav absolute left-0 z-40 mt-2 w-64 rounded-2xl p-2 shadow-[0_24px_80px_-40px_oklch(0_0_0/80%)]"
        >
          <div className="text-mono-label px-2 py-1.5">Status</div>
          <div className="flex flex-wrap gap-1.5 px-1 pb-1" role="listbox" aria-label="Status">
            {ISSUE_STATUSES.map((status) => {
              const isOn = selected === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="option"
                  aria-selected={isOn}
                  onClick={() => onChange(isOn ? null : status)}
                  className={`rounded-md transition ${isOn ? "ring-2 ring-secondary/70" : "opacity-55 hover:opacity-100"}`}
                >
                  <StatusPill tone={statusTone(status)}>{formatIssueStatus(status)}</StatusPill>
                </button>
              );
            })}
          </div>

          {selected && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs text-muted-foreground transition hover:bg-white/[0.04] hover:text-white"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function IssuesClient({ issues }: { issues: IssueRow[] }) {
  const [status, setStatus] = useState<string | null>(null);

  const filtered =
    status === null
      ? issues
      : issues.filter((i) => i.status === status);

  return (
    <>
      <IssueForm leading={<IssueFilter selected={status} onChange={setStatus} />} />
      <div className="space-y-2">
        {issues.length === 0 && (
          <div className="text-sm text-muted-foreground">No issues raised yet.</div>
        )}
        {issues.length > 0 && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No issues match the selected filter.</div>
        )}
        {filtered.map((i) => (
          <GlassCard key={i.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-mono-label">{i.category}</span>
              </div>
              <div className="truncate text-sm font-medium">{i.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">Raised by {i.raisedByName}</div>
              {i.attachments && i.attachments.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {i.attachments.map((src, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={idx} src={src} alt="" className="h-10 w-10 rounded-md border border-white/[0.12] object-cover" />
                  ))}
                </div>
              )}
            </div>
            <StatusPill tone={priorityTone(i.priority)}>{i.priority}</StatusPill>
            <StatusPill tone={statusTone(i.status)}>{formatIssueStatus(i.status)}</StatusPill>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
