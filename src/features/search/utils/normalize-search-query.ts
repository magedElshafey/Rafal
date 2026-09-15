import type { Locale } from "next-intl";

export function cleanSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function normalizeSearchQuery(query: string, locale: Locale): string {
  return cleanSearchQuery(query).toLocaleLowerCase(locale);
}
