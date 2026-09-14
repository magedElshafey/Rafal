import {
  dehydrate,
  HydrationBoundary,
  type InfiniteData,
  QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { categoriesQuery } from "@/features/categories/api/categories-query";
import { getCategoriesPage } from "@/features/categories/api/get-categories";
import { CategoriesList } from "@/features/categories/components/categories-list";
import { CategoriesRetry } from "@/features/categories/components/categories-retry";
import type { PaginatedCategories } from "@/features/categories/types";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "Metadata.CategoriesPage",
  });

  return {
    title: t("title"),
    alternates: getLocalizedAlternates(locale, "/categories"),
  };
}

export default async function CategoriesPage() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Common.categoriesPage"),
  ]);

  let firstPage: PaginatedCategories;

  try {
    firstPage = await getCategoriesPage();
  } catch {
    return (
      <Container className="main-content-spacing">
        <ErrorState
          title={t("initialErrorTitle")}
          description={t("initialErrorDescription")}
          action={
            <CategoriesRetry label={t("retry")} pendingLabel={t("retrying")} />
          }
        />
      </Container>
    );
  }

  const queryClient = new QueryClient();
  queryClient.setQueryData<InfiniteData<PaginatedCategories>>(
    categoriesQuery.key(locale),
    { pages: [firstPage], pageParams: [1] },
  );

  return (
    <Container className="main-content-spacing pb-10">
      <h1 className="text-h2 font-medium text-foreground">{t("title")}</h1>
      <div className="mt-6">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <CategoriesList
            locale={locale}
            copy={{
              initialErrorTitle: t("initialErrorTitle"),
              initialErrorDescription: t("initialErrorDescription"),
              loadMore: t("loadMore"),
              loadingMore: t("loadingMore"),
              nextPageError: t("nextPageError"),
              retry: t("retry"),
            }}
          />
        </HydrationBoundary>
      </div>
    </Container>
  );
}
