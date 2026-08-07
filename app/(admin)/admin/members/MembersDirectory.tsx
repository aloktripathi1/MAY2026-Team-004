"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Search, Upload, UserPlus, X } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { StatusPill, Btn } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { INTEREST_OPTIONS } from "@/lib/interests";
import { AddMemberModal } from "./AddMemberModal";
import { BulkImportModal } from "./BulkImportModal";
import { setMembershipRoleAction } from "@/backend/domain/approvals";

/**
 * Roles an admin may assign from this table. Admin is absent on purpose: a club
 * has exactly one, and /admin/handover moves it, demoting the outgoing admin in
 * the same transaction.
 */
const ASSIGNABLE_ROLES = ["Member", "Volunteer", "Coordinator"] as const;

export type MemberRow = {
  id: string;
  name: string;
  roll: string;
  role: string;
  status: string;
  joined: string;
  image?: string | null;
  interests: string[];
};

const ROLE_OPTIONS = ["All roles", "Member", "Volunteer", "Coordinator", "Admin"] as const;
const STATUS_OPTIONS = ["All statuses", "Active", "Pending", "Inactive"] as const;

function selectClasses() {
  return "w-fit appearance-none rounded-lg border border-white/[0.12] bg-white/[0.035] py-1.5 pl-3 pr-7 text-xs text-white outline-none transition focus:border-secondary/55";
}

function RoleControl({
  member, onError, disabled,
}: { member: MemberRow; onError: (message: string | null) => void; disabled: boolean }) {
  const [pending, startTransition] = useTransition();

  // The single Admin is shown as static text — changing it here would leave the
  // club with two admins or none.
  if (member.role === "Admin") {
    return <span className="text-xs">Admin</span>;
  }

  return (
    <div className="relative w-fit">
      <select
        value={member.role}
        disabled={disabled || pending}
        aria-label={`Role for ${member.name}`}
        onChange={(e) => {
          const next = e.target.value as (typeof ASSIGNABLE_ROLES)[number];
          onError(null);
          startTransition(async () => {
            try {
              await setMembershipRoleAction(member.id, next);
            } catch (err) {
              onError(err instanceof Error ? err.message : "Could not change that role.");
            }
          });
        }}
        className={selectClasses()}
      >
        {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function MembersDirectory({ members }: { members: MemberRow[] }) {
  const [roleError, setRoleError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("All roles");
  const [status, setStatus] = useState<string>("All statuses");
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  function toggleInterest(tag: string) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const activeFilterCount = (role !== "All roles" ? 1 : 0) + (status !== "All statuses" ? 1 : 0) + (interests.size > 0 ? 1 : 0);

  function clearFilters() {
    setRole("All roles");
    setStatus("All statuses");
    setInterests(new Set());
  }

  const filtered = members.filter((m) => {
    if (q && !(m.name.toLowerCase().includes(q.toLowerCase()) || m.roll.includes(q))) return false;
    if (role !== "All roles" && m.role !== role) return false;
    if (status !== "All statuses" && m.status !== status) return false;
    if (interests.size > 0 && !m.interests.some((i) => interests.has(i))) return false;
    return true;
  });
  const activeCount = members.filter(m => m.status === "Active").length;

  return (
    <>
      <PageHeader
        title={<>Every member, <span className="text-secondary">searchable.</span></>}
        description={`${members.length} members · ${activeCount} active`}
        actions={<>
          <Btn size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Bulk import</Btn>
          <Btn size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Add member</Btn>
        </>}
      />

      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} />
      <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <div className="night-panel mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-2.5">
        <div className="flex flex-1 items-center gap-2 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or roll number…" className="w-full bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-muted-foreground/60" />
        </div>
        <div className="text-mono-label">{filtered.length} / {members.length}</div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClasses()} aria-label="Filter by role">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="relative">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClasses()} aria-label="Filter by status">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by interest">
          {INTEREST_OPTIONS.map((tag) => {
            const isOn = interests.has(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleInterest(tag)}
                className={`rounded-md border px-2 py-1 text-[11px] transition ${
                  isOn
                    ? "border-secondary/55 bg-secondary/[0.12] text-secondary"
                    : "border-white/[0.12] bg-white/[0.035] text-muted-foreground hover:border-white/[0.24] hover:text-white"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-white"
          >
            <X className="h-3 w-3" /> Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {roleError && (
        <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/[0.12] px-4 py-2.5 text-sm text-destructive">
          {roleError}
        </p>
      )}

      <div className="night-panel overflow-hidden rounded-2xl">
        {/* Fixed-column table only fits desktop widths — 5 fields into 3
            mobile tracks pushed names down to one letter and wrapped Status
            onto its own misaligned row. Mobile gets a real card row instead. */}
        <div className="hidden grid-cols-[2fr_120px_120px_100px_110px] gap-4 border-b border-hairline px-6 py-3 text-mono-label md:grid">
          <div>Member</div>
          <div>Roll</div>
          <div>Role</div>
          <div>Joined</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-hairline">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No members match the current filters.</div>
          )}
          {filtered.map(m => (
            <div key={m.id}>
              <div className="flex items-center gap-3 p-4 transition hover:bg-white/[0.04] md:hidden">
                <Avatar name={m.name} image={m.image} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.roll} · Joined {m.joined}</div>
                  <div className="mt-2"><RoleControl member={m} onError={setRoleError} disabled={false} /></div>
                </div>
                <StatusPill tone={m.status === "Active" ? "green" : m.status === "Pending" ? "amber" : "slate"}>{m.status}</StatusPill>
              </div>
              <div className="hidden grid-cols-[2fr_120px_120px_100px_110px] items-center gap-4 px-6 py-4 transition hover:bg-white/[0.04] md:grid">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.name} image={m.image} size="sm" />
                  <div className="min-w-0 truncate text-sm font-medium">{m.name}</div>
                </div>
                <div className="text-mono-label !normal-case !tracking-normal text-xs">{m.roll}</div>
                <RoleControl member={m} onError={setRoleError} disabled={false} />
                <div className="text-xs text-muted-foreground">{m.joined}</div>
                <StatusPill tone={m.status === "Active" ? "green" : m.status === "Pending" ? "amber" : "slate"}>{m.status}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
