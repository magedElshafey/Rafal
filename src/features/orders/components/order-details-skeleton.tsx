import { Skeleton } from "@/components/ui/skeleton";

export function OrderDetailsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <Skeleton className="h-5 w-28" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-36" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-lg md:h-full" />
        <div className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
          <Skeleton className="h-6 w-32" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3, 4, 5].map(row => <Skeleton key={row} className="h-5 w-full" />)}
          </div>
          <Skeleton className="mt-5 h-16 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
