import "server-only";

import type { Locale } from "next-intl";

import { serverEnv } from "@/config/server-env";
import { mapCategoryDto } from "@/features/categories/api/category-mapper";
import type {
  Category,
  CategoryResponseDto,
} from "@/features/categories/types";
import { ApiError } from "@/lib/api/api-error";
import { serverApi } from "@/lib/api/server-api";

export async function getCategoryBySlug(
  slug: string,
  locale: Locale,
): Promise<Category> {
  if (serverEnv.useMockApi) {
    const { categoriesFixture } = await import("./category-fixture");
    const category = categoriesFixture.data.find((item) => item.slug === slug);

    if (!category) {
      throw new ApiError({ status: 404, message: "Category not found" });
    }

    return mapCategoryDto(category);
  }

  const response = await serverApi.request<CategoryResponseDto>({
    path: `/categories/${encodeURIComponent(slug)}`,
    headers: { "Accept-Language": locale },
  });

  return mapCategoryDto(response.data);
}
