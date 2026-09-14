import "server-only";

import { serverEnv } from "@/config/server-env";
import { mapCategoriesResponseDto } from "@/features/categories/api/category-mapper";
import type {
  CategoriesResponseDto,
  Category,
  PaginatedCategories,
} from "@/features/categories/types";
import { serverApi } from "@/lib/api/server-api";

export async function getCategories(): Promise<Category[]> {
  const page = await getCategoriesPage();

  return page.items;
}

export async function getCategoriesPage(
  page = 1,
): Promise<PaginatedCategories> {
  const response = serverEnv.useMockApi
    ? (await import("./category-fixture")).categoriesFixture
    : await serverApi.request<CategoriesResponseDto>({
        path: "/categories",
        query: { page },
      });

  return mapCategoriesResponseDto(response);
}
