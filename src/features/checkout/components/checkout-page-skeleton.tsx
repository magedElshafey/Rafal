import { Skeleton } from "@/components/ui/skeleton";

function StepSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex min-h-16 items-center gap-3 rounded-md border border-gray-200 px-4 py-3"
          >
            <Skeleton className="size-5 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="mt-2 h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <div aria-hidden="true" className="py-8 sm:py-10">
      <Skeleton className="h-9 w-44" />
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start rtl:lg:flex-row-reverse">
        <div className="min-w-0 flex-1 space-y-6">
          <StepSkeleton rows={1} />
          <StepSkeleton rows={2} />
          <StepSkeleton rows={4} />
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <Skeleton className="size-5 rounded-sm" />
              <div className="flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-2 h-4 w-52 max-w-full" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>

        <div className="w-full rounded-lg bg-gray-50 p-5 sm:p-6 lg:w-[22rem] lg:shrink-0">
          <Skeleton className="h-7 w-32" />
          <div className="mt-5 flex gap-3 border-b border-gray-200 pb-4">
            <Skeleton className="size-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          </div>
          <div className="space-y-4 pt-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between gap-4 border-t border-gray-200 pt-5">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="mt-5 h-13 w-full" />
        </div>
      </div>
    </div>
  );
}