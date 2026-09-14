import type { Locale } from "next-intl";

import type { PaginatedCategories } from "@/features/categories/types";
import { getNextPageParam } from "@/lib/api/pagination";

export const categoriesQuery = {
  key: (locale: Locale) => ["categories", "list", { locale }] as const,
  getNextPageParam: (lastPage: PaginatedCategories): number | undefined =>
    getNextPageParam(lastPage.pagination),
};
