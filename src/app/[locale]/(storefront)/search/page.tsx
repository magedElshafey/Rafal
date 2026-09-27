import { getLocale } from "next-intl/server";

import {
  normalizeProductSearchQuery,
  toUrlSearchParams,
} from "@/features/products/utils/catalogue-listing-search-params";
import { redirect } from "@/i18n/navigation";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [rawSearchParams, locale] = await Promise.all([
    searchParams,
    getLocale(),
  ]);
  const query = Array.isArray(rawSearchParams.q)
    ? rawSearchParams.q[0]
    : rawSearchParams.q;
  const search = normalizeProductSearchQuery(query);
  const nextSearchParams = toUrlSearchParams(rawSearchParams);
  nextSearchParams.delete("q");
  nextSearchParams.delete("search");
  if (search) nextSearchParams.set("search", search);

  redirect({
    href: nextSearchParams.size
      ? `/products?${nextSearchParams.toString()}`
      : "/products",
    locale,
  });
}
