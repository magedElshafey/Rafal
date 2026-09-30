import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function AboutUsSkeleton({ label }: { label: string }) {
  return (
    <div className="main-content-spacing" aria-busy="true" aria-label={label}>
      <div aria-hidden="true">
        <Container size="default" className="mb-5"><Skeleton className="h-4 w-36" /></Container>
        <div className="bg-success px-4 py-14 md:py-18">
          <Skeleton className="mx-auto h-8 w-56 max-w-full lg:h-12" />
          <Skeleton className="mx-auto mt-3 h-6 w-full max-w-2xl" />
        </div>
        <Container size="default" className="pt-10 md:pt-12">
          <Skeleton className="mb-10 aspect-video w-full rounded-lg md:mb-12" />
          <Skeleton className="h-8 w-40" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" />
          </div>
          <div className="mt-8 lg:mt-10 grid gap-5 md:gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-gray-0 p-6">
                <Skeleton className="h-7 w-32" />
                <div className="mt-2 space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>
              </div>
            ))}
          </div>
          <div className="mt-10 md:mt-12">
            <Skeleton className="h-8 w-44" />
            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="rounded-[12px] bg-gray-0 px-3 py-4 space-y-2">
                  <Skeleton className="mx-auto size-10 rounded-full" />
                  <Skeleton className="mx-auto h-5 w-3/4" />
                  <Skeleton className="mx-auto h-4 w-full" />
                  <Skeleton className="mx-auto h-4 w-4/5" />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
