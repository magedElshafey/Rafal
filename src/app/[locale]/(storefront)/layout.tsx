import AnnouncmentBanner from "@/components/shell/storefront/announcment-banner/AnnouncmentBanner";
import Footer from "@/components/shell/storefront/footer/Footer";
import Header from "@/components/shell/storefront/header/Header";
import MobileBottomNavigation from "@/components/shell/storefront/mobile-navigation/MobileBottomNavigation";
import QuickAccessHeader from "@/components/shell/storefront/quick-acess/QuickAccessHeader";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

type StoreFontLayoutProps = {
  children: ReactNode;
};

export default async function StoreFontLayout({
  children,
}: StoreFontLayoutProps) {
  const [t, locale] = await Promise.all([
    getTranslations("Common.headerUtility"),
    getLocale(),
  ]);
  const initialCity = await resolveCurrentLocation(locale);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <QuickAccessHeader
        initialCity={initialCity}
        locale={locale}
        locationCopy={{
          deliveryLabel: t("deliveryLabel"),
          selectCity: t("selectCity"),
          changeLocation: t("changeLocation"),
          dialogTitle: t("locationDialog.title"),
          dialogDescription: t("locationDialog.description"),
          loading: t("locationDialog.loading"),
          empty: t("locationDialog.empty"),
          close: t("locationDialog.close"),
          searchLabel: t("locationDialog.searchLabel"),
          searchPlaceholder: t("locationDialog.searchPlaceholder"),
          searchNoResults: t("locationDialog.searchNoResults"),
        }}
        searchCopy={{
          label: t("searchLabel"),
          placeholder: t("searchPlaceholder"),
          clear: t("search.clear"),
          loading: t("search.loading"),
          noResults: t("search.noResults"),
          suggestions: t("search.suggestions"),
        }}
      />
      <AnnouncmentBanner
        message="شحن مجاني للطلبات فوق ٢٠٠ ر.س"
        dismissible={true}
      />
      <main className="flex-1 mt-5">{children}</main>
      <Footer />
      <MobileBottomNavigation />
    </div>
  );
}
