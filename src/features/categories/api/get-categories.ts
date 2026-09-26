import "server-only";

import type { Locale } from "next-intl";

import { serverEnv } from "@/config/server-env";
import { mapCategoriesResponseDto } from "@/features/categories/api/category-mapper";
import type {
  CategoriesResponseDto,
  Category,
  PaginatedCategories,
} from "@/features/categories/types";
import { serverApi } from "@/lib/api/server-api";

export async function getCategories(locale: Locale): Promise<Category[]> {
  const page = await getCategoriesPage(locale);

  return page.items;
}

export async function getCategoriesPage(
  locale: Locale,
  page = 1,
): Promise<PaginatedCategories> {
  const response = serverEnv.useMockApi
    ? (await import("./category-fixture")).categoriesFixture
    : await serverApi.request<CategoriesResponseDto>({
        path: "/categories",
        headers: { "Accept-Language": locale },
        query: { page },
      });

  return mapCategoriesResponseDto(response);
}
