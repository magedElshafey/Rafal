import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

function StepSkeleton({ rows }: { rows: number }) {
  return (
    <section className="rounded-lg border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </section>
  );
}

export default function CheckoutLoading() {
  return (
    <Container className="main-content-spacing pb-12 lg:px-[3.75rem]">
      <Skeleton className="h-9 w-40" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6">
          <StepSkeleton rows={2} />
          <StepSkeleton rows={2} />
        </div>
        <aside className="rounded-lg bg-gray-50 p-5 sm:p-6">
          <Skeleton className="h-7 w-36" />
          <div className="mt-5 flex gap-3 border-b border-gray-200 pb-5">
            <Skeleton className="size-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex justify-between gap-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Container>
  );
}
