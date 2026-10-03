import { Skeleton } from "@/components/ui/skeleton";

export function OrdersListSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-8 w-36" />
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-0">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-20 items-center gap-4 border-b border-gray-200 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(10rem,1.5fr)_minmax(8rem,1fr)_minmax(8rem,auto)] sm:px-6"
          >
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3 w-44 max-w-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
