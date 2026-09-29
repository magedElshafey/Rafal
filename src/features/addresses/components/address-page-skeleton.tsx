import { Skeleton } from "@/components/ui/skeleton";

export function AddressPageSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-56 flex-1">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-3 h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-gray-0 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="mt-3 h-4 w-48 max-w-full" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="mt-5 flex gap-3">
              <Skeleton className="size-4 shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="mt-2 h-4 w-full" />
              </div>
            </div>
            <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
