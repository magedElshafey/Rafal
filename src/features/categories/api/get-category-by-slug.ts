import "server-only";

import type { Locale } from "next-intl";

import { mapCategoryDto } from "@/features/categories/api/category-mapper";
import type {
  Category,
  CategoryResponseDto,
} from "@/features/categories/types";
import { serverApi } from "@/lib/api/server-api";

export async function getCategoryBySlug(
  slug: string,
  locale: Locale,
): Promise<Category> {
  const response = await serverApi.request<CategoryResponseDto>({
    path: `/categories/${encodeURIComponent(slug)}`,
    headers: { "Accept-Language": locale },
  });

  return mapCategoryDto(response.data);
}
