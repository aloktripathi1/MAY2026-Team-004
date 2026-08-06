"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, Users } from "lucide-react";
import { StatusPill, Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { assignIssuesAction, updateIssuePriorityAction, updateIssueStatusAction } from "./actions";

const STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "InProgress", label: "In review" },
  { value: "Resolved", label: "Resolved" },
];

export type IssueRow = {
  id: string;
  ticket: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  raisedBy: string;
  raisedByImage?: string | null;
  timeAgo: string;
  assigneeId: string | null;
  assigneeName: string | null;
};

export type AssignableMember = { id: string; name: string };

type Filter = "All" | "Open" | "InReview" | "Urgent" | "Resolved";

function statusLabel(status: string) {
  return status === "InProgress" ? "In review" : status;
}

function statusTone(status: string): "green" | "amber" | "magenta" | "slate" {
  if (status === "Resolved") return "green";
  if (status === "InProgress") return "amber";
  return "magenta";
}

function priorityTone(priority: string): "magenta" | "amber" | "slate" {
  if (priority === "High") return "magenta";
  if (priority === "Med") return "amber";
  return "slate";
}

export function IssuesBoard({ issues, assignable }: { issues: IssueRow[]; assignable: AssignableMember[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => ({
    All: issues.length,
    Open: issues.filter((i) => i.status === "Open").length,
    InReview: issues.filter((i) => i.status === "InProgress").length,
    Urgent: issues.filter((i) => i.priority === "High" && i.status !== "Resolved").length,
    Resolved: issues.filter((i) => i.status === "Resolved").length,
  }), [issues]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "Open": return issues.filter((i) => i.status === "Open");
      case "InReview": return issues.filter((i) => i.status === "InProgress");
      case "Urgent": return issues.filter((i) => i.priority === "High" && i.status !== "Resolved");
      case "Resolved": return issues.filter((i) => i.status === "Resolved");
      default: return issues;
    }
  }, [issues, filter]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id))));
  }

  function quickAssign(issueId: string, assigneeId: string) {
    startTransition(async () => {
      await assignIssuesAction([issueId], assigneeId || null);
    });
  }

  function updatePriority(issueId: string, priority: string) {
    startTransition(async () => {
      await updateIssuePriorityAction(issueId, priority);
    });
  }

  function updateStatus(issueId: string, status: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateIssueStatusAction(issueId, status);
      if (res.error) setError(res.error);
    });
  }

  function statusSelect(issue: IssueRow) {
    return (
      <div className="relative w-fit">
        <select
          value={issue.status}
          onChange={(e) => updateStatus(issue.id, e.target.value)}
          disabled={pending}
          aria-label={`Status for ${issue.title}`}
          className="w-fit appearance-none rounded-lg border border-white/[0.12] bg-white/[0.035] py-1.5 pl-2 pr-6 text-xs text-white outline-none transition focus:border-secondary/55"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }

  function bulkAssign(assigneeId: string) {
    setError(null);
    startTransition(async () => {
      const res = await assignIssuesAction(Array.from(selected), assigneeId || null);
      if (res.error) setError(res.error);
      else {
        setSelected(new Set());
        setBulkOpen(false);
      }
    });
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "All", label: "All" },
    { key: "Open", label: "Open" },
    { key: "InReview", label: "In review" },
    { key: "Urgent", label: "Urgent" },
    { key: "Resolved", label: "Resolved" },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${
                filter === f.key
                  ? "border-secondary/55 bg-secondary/[0.12] text-secondary"
                  : "border-white/[0.12] bg-white/[0.035] text-muted-foreground hover:border-white/[0.24] hover:text-white"
              }`}
            >
              {f.label}
              <span className="font-mono text-[11px] opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <Btn size="sm" variant="outline" disabled={selected.size === 0} onClick={() => setBulkOpen(true)}>
          <Users className="h-4 w-4" /> Bulk assign{selected.size > 0 ? ` (${selected.size})` : ""}
        </Btn>
      </div>

      {error && !bulkOpen && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <div className="night-panel overflow-x-auto rounded-2xl">
        {/* 6 fixed-px columns forced a 760px min-width table on every
            screen — usable only via horizontal scroll on mobile, with a
            bulk-select checkbox stranded off-screen. Mobile gets a real
            stacked card instead; md+ keeps the original table. */}
        <div className="hidden grid-cols-[24px_2fr_110px_90px_140px_110px] items-center gap-4 border-b border-hairline px-6 py-3 text-mono-label md:grid md:min-w-[760px]">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleAll}
            className="accent-primary"
            aria-label="Select all"
          />
          <div>Issue</div>
          <div>Category</div>
          <div>Priority</div>
          <div>Assignee</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-hairline md:min-w-[760px]">
          {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No issues in this view.</div>}
          {filtered.map((issue) => (
            <div key={issue.id}>
              <div className="p-4 transition hover:bg-white/[0.04] md:hidden">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(issue.id)}
                    onChange={() => toggle(issue.id)}
                    className="mt-1 accent-primary"
                    aria-label={`Select ${issue.title}`}
                  />
                  <Avatar name={issue.raisedBy} image={issue.raisedByImage} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{issue.title}</div>
                    <div className="truncate text-xs text-muted-foreground">#{issue.ticket} · {issue.raisedBy} · {issue.timeAgo}</div>
                  </div>
                  <StatusPill tone={statusTone(issue.status)}>{statusLabel(issue.status)}</StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 pl-9">
                  <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[10px] text-muted-foreground">{issue.category}</span>
                  <div className="relative w-fit">
                    <select
                      value={issue.priority}
                      onChange={(e) => updatePriority(issue.id, e.target.value)}
                      disabled={pending}
                      className="w-fit appearance-none rounded-lg border border-white/[0.12] bg-white/[0.035] py-1.5 pl-2 pr-6 text-xs text-white outline-none transition focus:border-secondary/55"
                    >
                      <option value="Low">Low</option>
                      <option value="Med">Medium</option>
                      <option value="High">High</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <div className="relative w-fit">
                    <select
                      value={issue.assigneeId ?? ""}
                      onChange={(e) => quickAssign(issue.id, e.target.value)}
                      disabled={pending}
                      className="w-fit appearance-none rounded-lg border border-white/[0.12] bg-white/[0.035] py-1.5 pl-2 pr-6 text-xs text-white outline-none transition focus:border-secondary/55"
                    >
                      <option value="">Unassigned</option>
                      {assignable.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {statusSelect(issue)}
                </div>
              </div>
              <div className="hidden grid-cols-[24px_2fr_110px_90px_140px_110px] items-center gap-4 px-6 py-4 transition hover:bg-white/[0.04] md:grid">
                <input
                  type="checkbox"
                  checked={selected.has(issue.id)}
                  onChange={() => toggle(issue.id)}
                  className="accent-primary"
                  aria-label={`Select ${issue.title}`}
                />
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={issue.raisedBy} image={issue.raisedByImage} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{issue.title}</div>
                    <div className="text-xs text-muted-foreground">#{issue.ticket} · {issue.raisedBy} · {issue.timeAgo}</div>
                  </div>
                </div>
                <div className="text-xs">{issue.category}</div>
                <div className="relative w-fit">
                  <select
                    value={issue.priority}
                    onChange={(e) => updatePriority(issue.id, e.target.value)}
                    disabled={pending}
                    className="w-fit appearance-none rounded-lg border border-white/[0.12] bg-white/[0.035] py-1.5 pl-2 pr-6 text-xs text-white outline-none transition focus:border-secondary/55"
                  >
                    <option value="Low">Low</option>
                    <option value="Med">Medium</option>
                    <option value="High">High</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
                <div className="relative w-fit">
                  <select
                    value={issue.assigneeId ?? ""}
                    onChange={(e) => quickAssign(issue.id, e.target.value)}
                    disabled={pending}
                    className="w-fit appearance-none rounded-lg border border-white/[0.12] bg-white/[0.035] py-1.5 pl-2 pr-6 text-xs text-white outline-none transition focus:border-secondary/55"
                  >
                    <option value="">Unassigned</option>
                    {assignable.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
                {statusSelect(issue)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={`Bulk assign ${selected.size} issue${selected.size === 1 ? "" : "s"}`}>
        <div className="space-y-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => bulkAssign("")}
            className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-left text-sm text-white transition hover:border-secondary/45 hover:bg-white/[0.06]"
          >
            Unassigned
          </button>
          {assignable.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={pending}
              onClick={() => bulkAssign(m.id)}
              className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-left text-sm text-white transition hover:border-secondary/45 hover:bg-white/[0.06]"
            >
              {m.name}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end">
          <Btn type="button" variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Btn>
        </div>
      </Modal>
    </>
  );
}
