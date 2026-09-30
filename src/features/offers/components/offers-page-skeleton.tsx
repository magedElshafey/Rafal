import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/features/products/components/listing/product-grid";

export function OffersPageSkeleton({ label }: { label: string }) {
  return (
    <Container className="main-content-spacing" aria-busy="true" aria-label={label}>
      <div aria-hidden="true">
        <Skeleton className="h-[var(--text-ui-sm--line-height)] w-36" />
        <div className="mt-5 space-y-2">
          <Skeleton className="h-[var(--text-h1--line-height)] w-64 max-w-full" />
          <Skeleton className="h-[var(--text-body--line-height)] w-96 max-w-full" />
        </div>
        <div className="mt-8 space-y-10">
          <div className="space-y-5">
            <Skeleton className="h-[var(--text-h3--line-height)] w-40" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex min-w-0 flex-col gap-4 rounded-lg border border-gray-200 bg-gray-0 p-6">
                  <Skeleton className="h-[var(--text-h4--line-height)] w-3/4" />
                  <Skeleton className="h-[var(--text-body-lg--line-height)] w-1/2" />
                  <div className="min-h-12 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 3 }, (_, row) => (
                      <Skeleton key={row} className="h-[var(--text-body-sm--line-height)] w-full" />
                    ))}
                  </div>
                  <div className="mt-auto space-y-3 border-t border-gray-200 pt-4">
                    <div className="space-y-1">
                      <Skeleton className="h-[var(--text-body-sm--line-height)] w-20" />
                      <Skeleton className="h-[var(--text-body-lg--line-height)] w-36" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-11 w-full rounded-md" />
                      <div className="min-h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <Skeleton className="h-[var(--text-h3--line-height)] w-52" />
            <ProductGridSkeleton />
          </div>
        </div>
      </div>
    </Container>
  );
}
