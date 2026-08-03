"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { clubMatchesInterest } from "@/lib/club-interests";
import { INTEREST_OPTIONS } from "@/lib/interests";
import { ClubDiscoveryCard, type DiscoverClub } from "./ClubDiscoveryCard";

const CATEGORIES = ["All", "Technical", "Cultural", "Sports", "Entrepreneurship", "Literary", "Social", "Design"] as const;

type FilterableClub = DiscoverClub & { description: string; pendingRequested: boolean };

/** Filterable "Discover more" grid (#106) — category + interest-tag filters
 * over the full discovery list, same chip pattern as the public /clubs
 * browser (ClubsBrowser.tsx). */
export function DiscoverClubsSection({ clubs }: { clubs: FilterableClub[] }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [interest, setInterest] = useState<string | null>(null);

  const filtered = clubs.filter((c) => {
    if (category !== "All" && c.category !== category) return false;
    if (interest && !clubMatchesInterest(c, interest)) return false;
    return true;
  });

  const hasActiveFilters = category !== "All" || interest !== null;

  return (
    <>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">Category</div>
      <div className="mb-3 flex flex-wrap gap-1.5">
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
      </div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">Interest</div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by interest">
        {INTEREST_OPTIONS.map((tag) => {
          const isOn = interest === tag;
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isOn}
              onClick={() => setInterest(isOn ? null : tag)}
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
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setCategory("All"); setInterest(null); }}
            className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-white"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>
      {hasActiveFilters && (
        <div className="mb-3 text-xs text-muted-foreground">{filtered.length} of {clubs.length}</div>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {filtered.length === 0 && <div className="text-sm text-muted-foreground">No clubs match the current filters.</div>}
        {filtered.map((c) => (
          <ClubDiscoveryCard key={c.id} club={c} initialRequested={c.pendingRequested} />
        ))}
      </div>
    </>
  );
}
