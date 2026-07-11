"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

const OPTIONS = [
  { value: "All", label: "All statuses" },
  { value: "Open", label: "Open" },
  { value: "InProgress", label: "In progress" },
  { value: "Resolved", label: "Resolved" },
];

export function StatusFilter({ status }: { status: string }) {
  const router = useRouter();

  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => {
          const value = e.target.value;
          router.push(value === "All" ? "/app/issues" : `/app/issues?status=${value}`);
        }}
        className="appearance-none rounded-full border border-white/[0.12] bg-white/[0.035] py-2.5 pl-4 pr-9 text-sm text-white outline-none transition focus:border-secondary/55"
      >
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
