"use client";

import { useState } from "react";
import { Search, Upload, Download } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { StatusPill, Btn } from "@/components/ui/primitives";

export type MemberRow = {
  id: string;
  name: string;
  roll: string;
  role: string;
  status: string;
  joined: string;
};

export function MembersDirectory({ members }: { members: MemberRow[] }) {
  const [q, setQ] = useState("");
  const filtered = members.filter(m => m.name.toLowerCase().includes(q.toLowerCase()) || m.roll.includes(q));

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title={<>Every member, <span className="text-display text-primary italic">searchable.</span></>}
        actions={<>
          <Btn size="sm" variant="outline"><Download className="h-4 w-4" /> Export</Btn>
          <Btn size="sm"><Upload className="h-4 w-4" /> Bulk import</Btn>
        </>}
      />

      <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-2.5">
        <div className="flex flex-1 items-center gap-2 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or roll number…" className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/50" />
        </div>
        <div className="text-mono-label">{filtered.length} / {members.length}</div>
      </div>

      <div className="glass-strong overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[1fr_120px_110px] gap-4 border-b border-hairline px-6 py-3 text-mono-label md:grid-cols-[2fr_120px_120px_110px]">
          <div>Member</div>
          <div>Roll</div>
          <div>Role</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-hairline">
          {filtered.map(m => (
            <div key={m.id} className="grid grid-cols-[1fr_120px_110px] items-center gap-4 px-6 py-4 transition hover:bg-surface-2/40 md:grid-cols-[2fr_120px_120px_110px]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold bg-primary/15 text-primary">
                  {m.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">Joined {m.joined}</div>
                </div>
              </div>
              <div className="text-mono-label !normal-case !tracking-normal text-xs">{m.roll}</div>
              <div className="text-xs">{m.role}</div>
              <StatusPill tone={m.status === "Active" ? "green" : m.status === "Pending" ? "amber" : "slate"}>{m.status}</StatusPill>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
