import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function StaticPageSkeleton({ label }: { label: string }) {
  return (
    <div className="pb-12 md:pb-16" aria-busy="true" aria-label={label}>
      <div aria-hidden="true">
        <div className="border-b border-gold-100 bg-gold-50/50 py-8 md:py-12">
          <Container size="narrow">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="mt-6 h-9 w-80 max-w-full" />
          </Container>
        </div>
        <Container size="narrow" className="mt-8 md:mt-10">
          <div className="rounded-lg border border-border bg-background p-5 sm:p-8">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className={index > 0 ? "mt-8" : undefined}>
                <Skeleton className="h-8 w-48 max-w-full" />
                <div className="mt-4 space-y-4 py-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                {index === 1 ? (
                  <div className="my-4 space-y-2 ps-6">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="flex items-center gap-3 py-2">
                        <Skeleton className="size-1 shrink-0 rounded-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </div>
    </div>
  );
}
