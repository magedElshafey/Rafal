import type { Locale } from "next-intl";

export function formatBlogDate(locale: Locale, timestamp: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(timestamp));
}
