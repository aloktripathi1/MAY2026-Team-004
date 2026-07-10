import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export function StatSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass rounded-2xl p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-10 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-strong divide-y divide-hairline overflow-hidden rounded-2xl">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({
  stats = 4,
  rows = 5,
}: {
  stats?: number;
  rows?: number;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12">
      <div className="mb-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-12 w-full max-w-xl" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
      </div>
      <StatSkeletonGrid count={stats} />
      <div className="mt-8">
        <ListSkeleton rows={rows} />
      </div>
    </div>
  );
}
