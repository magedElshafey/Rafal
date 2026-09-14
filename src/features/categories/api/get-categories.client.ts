import type { Locale } from "next-intl";

import { mapCategoriesResponseDto } from "@/features/categories/api/category-mapper";
import type {
  CategoriesResponseDto,
  PaginatedCategories,
} from "@/features/categories/types";
import { createClientApi } from "@/lib/api/client-api";

type GetCategoriesPageOptions = {
  locale: Locale;
  page: number;
  signal?: AbortSignal;
};

export async function getCategoriesPageClient({
  locale,
  page,
  signal,
}: GetCategoriesPageOptions): Promise<PaginatedCategories> {
  const response = await createClientApi(locale).request<CategoriesResponseDto>(
    {
      path: "/categories",
      query: { page },
      signal,
    },
  );

  return mapCategoriesResponseDto(response);
}
