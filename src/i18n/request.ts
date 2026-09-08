import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as getRootLocale } from "next/root-params";

import { routing } from "./routing";

const messageLoaders = {
  ar: async () => {
    const [common, contentPages, home, metadata] = await Promise.all([
      import("../messages/ar/common.json"),
      import("../messages/ar/content-pages.json"),
      import("../messages/ar/home.json"),
      import("../messages/ar/metadata.json"),
    ]);

    return {
      Common: common.default,
      ContentPages: contentPages.default,
      Home: home.default,
      Metadata: metadata.default,
    };
  },

  en: async () => {
    const [common, contentPages, home, metadata] = await Promise.all([
      import("../messages/en/common.json"),
      import("../messages/en/content-pages.json"),
      import("../messages/en/home.json"),
      import("../messages/en/metadata.json"),
    ]);

    return {
      Common: common.default,
      ContentPages: contentPages.default,
      Home: home.default,
      Metadata: metadata.default,
    };
  },
} satisfies Record<
  (typeof routing.locales)[number],
  () => Promise<Record<string, unknown>>
>;

export default getRequestConfig(async ({ locale }) => {
  const requested = locale ?? (await getRootLocale());

  const resolvedLocale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale: resolvedLocale,
    messages: await messageLoaders[resolvedLocale](),
  };
});
