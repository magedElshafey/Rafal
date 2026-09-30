import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/i18n/routing";
import { QueryProvider } from "@/components/providers/query-provider";
import { RafalToaster } from "@/components/ui/rafal-toaster";
import { serverEnv } from "@/config/server-env";
import "../globals.css";

const tajawal = localFont({
  src: [
    { path: "../fonts/Tajawal-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Tajawal-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Tajawal-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-tajawal",
  display: "swap",
});

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({
    locale,
    namespace: "Metadata",
  });

  return {
    metadataBase: serverEnv.siteUrl,
    title: {
      default: t("siteName"),
      template: `%s | ${t("siteName")}`,
    },
    description: t("siteDescription"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={direction}>
      <body className={tajawal.variable}>
        <NextIntlClientProvider>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
        <RafalToaster direction={direction} />
      </body>
    </html>
  );
}
