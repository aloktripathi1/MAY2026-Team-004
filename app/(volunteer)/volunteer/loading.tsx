import { PageSkeleton } from "@/components/ui/Skeleton";

export default function VolunteerLoading() {
  return <PageSkeleton stats={3} rows={5} />;
}
