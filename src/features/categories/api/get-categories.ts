import "server-only";

import { serverEnv } from "@/config/server-env";
import { mapCategoryDto } from "@/features/categories/api/category-mapper";
import type {
  CategoriesResponseDto,
  Category,
} from "@/features/categories/types";
import { serverApi } from "@/lib/api/server-api";

export async function getCategories(): Promise<Category[]> {
  const response = serverEnv.useMockApi
    ? (await import("./category-fixture")).categoriesFixture
    : await serverApi.request<CategoriesResponseDto>({ path: "/categories" });

  return response.data.map(mapCategoryDto);
}
