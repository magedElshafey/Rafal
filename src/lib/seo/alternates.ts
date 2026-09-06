import type { Metadata } from "next";

import { routing } from "@/i18n/routing";

type Locale = (typeof routing.locales)[number];

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
