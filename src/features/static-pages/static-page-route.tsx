import "server-only";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getLocalizedAlternates } from "@/lib/seo/alternates";
import { getStaticPageForRequest } from "./api/get-static-page";
import { staticPageRegistry, type StaticPageKey } from "./static-page-registry";
import { StaticPageScreen } from "./components/static-page-screen";

export async function getStaticPageMetadata(pageKey: StaticPageKey): Promise<Metadata> {
  const locale = await getLocale();
  const [page, t] = await Promise.all([
    getStaticPageForRequest(pageKey, locale),
    getTranslations({ locale, namespace: "ContentPages.staticPages" }),
  ]);
  if (!page) return {};
  return {
    title: page.title,
    description: t(`metadata.${pageKey}`),
    alternates: getLocalizedAlternates(locale, staticPageRegistry[pageKey].route),
  };
}

export async function StaticPageRoute({ pageKey }: { pageKey: StaticPageKey }) {
  const locale = await getLocale();
  const page = await getStaticPageForRequest(pageKey, locale);
  if (!page) notFound();
  return <StaticPageScreen page={page} locale={locale} />;
}
