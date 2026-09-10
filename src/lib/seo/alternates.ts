import type { Metadata } from "next";
import type { Locale } from "next-intl";

import { routing } from "@/i18n/routing";

export function getLocalizedAlternates(
  locale: Locale,
  pathname: string,
): Metadata["alternates"] {
  return {
    canonical: `/${locale}${pathname}`,

    languages: Object.fromEntries(
      routing.locales.map((supportedLocale) => [
        supportedLocale,
        `/${supportedLocale}${pathname}`,
      ]),
    ),
  };
}
