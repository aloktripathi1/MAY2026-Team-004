import { PageSkeleton } from "@/components/ui/Skeleton";

export default function MemberLoading() {
  return <PageSkeleton stats={4} rows={5} />;
}
