import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ProductLoading() {
  const t = await getTranslations("Common.productDetails.route");

  return (
    <Container
      aria-busy="true"
      className="main-content-spacing lg:px-[3.75rem]"
    >
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <Skeleton className="h-5 w-52 max-w-full" />
      <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12 rtl:lg:flex-row-reverse">
        <div className="min-w-0 lg:w-[44%]">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="mt-4 flex max-w-full gap-3 overflow-hidden">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="size-22 shrink-0 rounded-md" />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-5">
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-13 w-full" />
          <Skeleton className="h-44 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="mt-10 h-32 w-full rounded-lg lg:mt-12" />
    </Container>
  );
}
