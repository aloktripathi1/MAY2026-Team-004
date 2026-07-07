"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Search } from "lucide-react";
import { GlassCard, StatusPill } from "@/components/ui/primitives";

export type ClubListItem = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  active: boolean;
  hue: string;
  emoji: string;
  founded: string;
  description: string;
  members: number;
};

const categories = ["All", "Technical", "Cultural", "Sports", "Entrepreneurship", "Literary", "Social", "Design"];

export function ClubsBrowser({ clubs }: { clubs: ClubListItem[] }) {
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const [q, setQ] = useState("");
  const filtered = clubs.filter(c =>
    (cat === "All" || c.category === cat) &&
    (q === "" || c.name.toLowerCase().includes(q.toLowerCase()) || c.tagline.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <Link href="/" className="text-mono-label mb-6 inline-flex items-center gap-1.5 hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back</Link>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <div className="text-mono-label mb-3">Directory</div>
          <h1 className="text-display text-5xl leading-none md:text-7xl">Every club, one page.</h1>
          <p className="mt-3 max-w-lg text-muted-foreground">Filter by category. Follow the ones you'll actually show up to.</p>
        </div>
        <div className="hidden text-sm text-muted-foreground sm:block">{filtered.length} of {clubs.length}</div>
      </div>

      <div className="glass mt-8 flex flex-wrap items-center gap-2 rounded-2xl p-2.5">
        <div className="flex flex-1 items-center gap-2 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search a club or a vibe…"
            className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${cat === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {filtered.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.4 }}
          >
            <GlassCard className="h-full">
              <div className="mb-6 flex items-start justify-between">
                <div className="text-4xl" style={{ color: `oklch(0.9 0.2 ${c.hue})` }}>{c.emoji}</div>
                <StatusPill tone={c.active ? "lime" : "slate"}>{c.active ? "Active" : "Quiet"}</StatusPill>
              </div>
              <div className="text-base font-medium">{c.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.tagline}</div>
              <p className="mt-4 line-clamp-3 text-xs text-muted-foreground/80">{c.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4 text-mono-label">
                <span>{c.members} members</span>
                <span>Since {c.founded}</span>
              </div>
              <Link href="/signup" className="mt-4 block rounded-xl bg-surface-2 py-2 text-center text-xs transition hover:bg-primary hover:text-primary-foreground">
                Join club →
              </Link>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
