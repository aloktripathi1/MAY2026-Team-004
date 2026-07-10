import { PageSkeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return <PageSkeleton stats={4} rows={5} />;
}
