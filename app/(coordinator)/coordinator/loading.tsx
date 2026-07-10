import { PageSkeleton } from "@/components/ui/Skeleton";

export default function CoordinatorLoading() {
  return <PageSkeleton stats={3} rows={4} />;
}
