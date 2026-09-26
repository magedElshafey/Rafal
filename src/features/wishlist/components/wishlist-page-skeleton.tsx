import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/features/products/components/listing/product-grid";

export function WishlistPageSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-5 w-full max-w-md" />
      <div className="mt-6">
        <Skeleton className="mb-5 h-4 w-24" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
