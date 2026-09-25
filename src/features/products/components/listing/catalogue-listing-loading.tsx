import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/features/products/components/listing/product-grid";

export async function CatalogueListingLoading() {
  const t = await getTranslations("Common.productListing");

  return (
    <Container aria-busy="true" className="main-content-spacing pb-12">
      <span className="sr-only" role="status">{t("loading")}</span>
      <Skeleton className="h-5 w-52 max-w-full" />
      <div className="mt-5 space-y-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <Skeleton className="hidden h-80 rounded-lg md:block" />
        <div className="min-w-0">
          <div className="mb-6 flex justify-end">
            <Skeleton className="h-11 w-44" />
          </div>
          <ProductGridSkeleton />
        </div>
      </div>
    </Container>
  );
}
