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
      className="min-w-0 scroll-mt-8"
    >
      <h2 id="product-reviews-title" className="text-h3 font-bold">
        {title}
      </h2>
      <p role="status" className="sr-only">
        {loadingLabel}
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2" aria-hidden="true">
        {[0, 1].map((index) => (
          <div key={index} className="rounded-lg bg-gray-50 p-5">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="mt-2 h-3 w-16" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
