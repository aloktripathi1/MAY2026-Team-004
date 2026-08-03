"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ClubDiscoveryCard, type DiscoverClub } from "./ClubDiscoveryCard";

const CATEGORIES = ["All", "Technical", "Cultural", "Sports", "Entrepreneurship", "Literary", "Social", "Design"] as const;

type FilterableClub = DiscoverClub & { pendingRequested: boolean };

/** Filterable "Discover more" grid (#106) — category filter over the full
 * discovery list, same chip pattern as the public /clubs browser
 * (ClubsBrowser.tsx). */
export function DiscoverClubsSection({ clubs }: { clubs: FilterableClub[] }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = clubs.filter((c) => category === "All" || c.category === category);
  const hasActiveFilters = category !== "All";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              category === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2"
            }`}
          >
            {c}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => setCategory("All")}
            className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-white"
          >
            <X className="h-3 w-3" /> Clear filter
          </button>
        )}
      </div>
      {hasActiveFilters && (
        <div className="mb-3 text-xs text-muted-foreground">{filtered.length} of {clubs.length}</div>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {filtered.length === 0 && <div className="text-sm text-muted-foreground">No clubs match the current filter.</div>}
        {filtered.map((c) => (
          <ClubDiscoveryCard key={c.id} club={c} initialRequested={c.pendingRequested} />
        ))}
      </div>
    </>
  );
}
