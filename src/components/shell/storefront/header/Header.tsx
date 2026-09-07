import AppLogo from "@/components/shared/AppLogo";
import HeaderActions from "@/components/shell/storefront/header/HeaderActions";
import ListLinks from "@/components/shell/storefront/header/PrimaryNavigation";
import QuickAccessHeader from "@/components/shell/storefront/quick-acess/QuickAccessHeader";
import { Container } from "@/components/ui/container";
import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";
import { cityService } from "@/features/location/services/city-service";
import type { CityLocale } from "@/features/location/types";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

const Header = async () => {
  const [t, requestedLocale, cookieStore] = await Promise.all([
    getTranslations("Common.headerUtility"),
    getLocale(),
    cookies(),
  ]);
  const locale: CityLocale = requestedLocale === "en" ? "en" : "ar";
  const persistedCityId = cookieStore.get(GUEST_CITY_COOKIE_NAME)?.value;
  const initialCity = persistedCityId
    ? await cityService.getCityById(persistedCityId, locale)
    : null;

  return (
    <header>
      <Container className="flex min-h-16 items-center justify-between gap-4 py-3 md:min-h-20 md:py-4">
        <div className="shrink-0">
          <AppLogo />
        </div>

        <ListLinks />

        <div className="shrink-0">
          <HeaderActions />
        </div>
      </Container>

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
          unavailable: t("locationDialog.unavailable"),
          close: t("locationDialog.close"),
          searchLabel: t("locationDialog.searchLabel"),
          searchPlaceholder: t("locationDialog.searchPlaceholder"),
          searchNoResults: t("locationDialog.searchNoResults"),
          useCurrentLocation: t("locationDialog.useCurrentLocation"),
          geolocationLoading: t("locationDialog.geolocationLoading"),
          geolocationError: t("locationDialog.geolocationError"),
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
    </header>
  );
};

export default Header;
