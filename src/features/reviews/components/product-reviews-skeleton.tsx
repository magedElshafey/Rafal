import { Skeleton } from "@/components/ui/skeleton";

export function ProductReviewsSkeleton({
  title,
  loadingLabel,
}: {
  title: string;
  loadingLabel: string;
}) {
  return (
    <section
      id="reviews"
      aria-labelledby="product-reviews-title"
      aria-busy="true"
      tabIndex={-1}
      className="min-w-0 scroll-mt-8 rounded-2xl border border-gray-200 bg-gray-0 p-5 sm:p-7"
    >
      <h2 id="product-reviews-title" className="text-h3 font-bold">
        {title}
      </h2>
      <p role="status" className="sr-only">
        {loadingLabel}
      </p>
      <div className="mt-6 overflow-hidden" aria-hidden="true">
        <div className="-ms-4 flex">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="min-w-0 shrink-0 basis-[88%] ps-4 sm:basis-[58%] lg:basis-1/2 xl:basis-1/3"
            >
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-2 h-3 w-16" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
