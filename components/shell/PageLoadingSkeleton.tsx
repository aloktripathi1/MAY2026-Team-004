// Route-level Suspense fallback (see the `loading.tsx` in each persona route
// group). Without this, Next.js shows nothing while a page's Server
// Component data is fetching — so pages with cheap queries felt instant and
// pages with heavier aggregation (e.g. admin metrics) felt like the click
// hadn't registered. This gives every navigation the same immediate,
// consistent feedback regardless of how long the underlying fetch takes.
export function PageLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded bg-white/[0.06]" />
      <div className="mt-3 h-9 w-72 rounded bg-white/[0.08]" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-white/[0.05]" />

      <div className="mt-8 grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="night-panel h-[92px] rounded-2xl" />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="night-panel h-20 rounded-2xl" />
          ))}
        </div>
        <div className="night-panel h-64 rounded-2xl" />
      </div>
    </div>
  );
}
