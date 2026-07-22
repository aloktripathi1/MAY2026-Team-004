"use client";

import { useState } from "react";
import { Search, Upload, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { StatusPill, Btn } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { AddMemberModal } from "./AddMemberModal";
import { BulkImportModal } from "./BulkImportModal";

export type MemberRow = {
  id: string;
  name: string;
  roll: string;
  role: string;
  status: string;
  joined: string;
  image?: string | null;
};

export function MembersDirectory({ members }: { members: MemberRow[] }) {
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const filtered = members.filter(m => m.name.toLowerCase().includes(q.toLowerCase()) || m.roll.includes(q));
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

      <div className="night-panel overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[1fr_120px_110px] gap-4 border-b border-hairline px-6 py-3 text-mono-label md:grid-cols-[2fr_120px_120px_100px_110px]">
          <div>Member</div>
          <div>Roll</div>
          <div>Role</div>
          <div className="hidden md:block">Joined</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-hairline">
          {filtered.map(m => (
            <div key={m.id} className="grid grid-cols-[1fr_120px_110px] items-center gap-4 px-6 py-4 transition hover:bg-white/[0.04] md:grid-cols-[2fr_120px_120px_100px_110px]">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={m.name} image={m.image} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground md:hidden">Joined {m.joined}</div>
                </div>
              </div>
              <div className="text-mono-label !normal-case !tracking-normal text-xs">{m.roll}</div>
              <div className="text-xs">{m.role}</div>
              <div className="hidden text-xs text-muted-foreground md:block">{m.joined}</div>
              <StatusPill tone={m.status === "Active" ? "green" : m.status === "Pending" ? "amber" : "slate"}>{m.status}</StatusPill>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
