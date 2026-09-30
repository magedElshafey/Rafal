import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function BlogCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-background">
      <Skeleton className={compact ? "aspect-[16/7] rounded-none" : "aspect-video rounded-none"} />
      <div className={compact ? "px-4 py-3" : "p-4"}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className={compact ? "mt-1 h-6 w-4/5" : "mt-1 h-7 w-4/5"} />
        {!compact ? (
          <>
            <div className="mt-1 space-y-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            <Skeleton className="mt-2 h-[var(--text-caption--line-height)] w-28" />
          </>
        ) : null}
      </div>
    </div>
  );
}
export function BlogListingSkeleton({ label }: { label: string }) {
  return (
    <Container className="main-content-spacing" aria-busy="true" aria-label={label}>
      <div aria-hidden="true">
        <Skeleton className="h-4 w-36" />
        <div className="mt-5 mb-8 md:mb-12">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="mt-6 sm:mt-7 md:mt-8 h-6 w-full max-w-2xl" />
        </div>
        <div className="grid overflow-hidden rounded-lg border border-gray-200 bg-gray-0 md:grid-cols-2">
          <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-4 h-8 w-4/5" />
            <div className="mt-3 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            <Skeleton className="mt-4 h-[var(--text-caption--line-height)] w-28" />
          </div>
          <Skeleton className="aspect-video h-full min-h-56 rounded-none" />
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <BlogCardSkeleton key={index} />)}
        </div>
      </div>
    </Container>
  );
}
