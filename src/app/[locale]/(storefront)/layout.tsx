import AnnouncmentBanner from "@/components/shell/storefront/announcment-banner/AnnouncmentBanner";
import Footer from "@/components/shell/storefront/footer/Footer";
import Header from "@/components/shell/storefront/header/Header";
import MobileBottomNavigation from "@/components/shell/storefront/mobile-navigation/MobileBottomNavigation";
import QuickAccessHeader from "@/components/shell/storefront/quick-acess/QuickAccessHeader";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { getCategoriesPage } from "@/features/categories/api/get-categories";
import { mapCategoryNavigation } from "@/features/categories/utils/category-navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";

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
  const categoriesPagePromise = getCategoriesPage(locale);
  const categoriesPromise = categoriesPagePromise.then(
    (page) => mapCategoryNavigation(page.items),
    () => [],
  );
  const footerShoppingLinksPromise = categoriesPagePromise.then(
    (page) =>
      page.items.slice(0, 5).map((category) => ({
        href: `/categories/${category.slug}`,
        label: category.name,
      })),
    () => [],
  );

  const initialCity = await resolveCurrentLocation(locale);
  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categoriesPromise} />
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
          error: t("search.error"),
          retry: t("search.retry"),
          suggestions: t("search.suggestions"),
        }}
      />
      <AnnouncmentBanner
        message="شحن مجاني للطلبات فوق ٢٠٠ ر.س"
        dismissible={true}
      />
      <main className="flex-1 mt-5">{children}</main>
      <Footer shoppingLinks={footerShoppingLinksPromise} />
      <Suspense fallback={<MobileBottomNavigation categories={[]} />}>
        <MobileBottomNavigation categories={categoriesPromise} />
      </Suspense>
    </div>
  );
}
