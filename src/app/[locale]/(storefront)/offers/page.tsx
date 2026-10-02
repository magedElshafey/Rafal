import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { getCanonicalBackendCityId } from "@/features/location/types";
import { getOffersData } from "@/features/offers/api/get-offers-data";
import { CouponsSection } from "@/features/offers/components/coupons-section";
import { OffersProductListing } from "@/features/offers/components/offers-product-listing";
import { Link } from "@/i18n/navigation";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Metadata.OffersPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: getLocalizedAlternates(locale, "/offers"),
  };
}

export default async function OffersPage() {
  const locale = await getLocale();
  const [t, { offers, cityId }, user] = await Promise.all([
    getTranslations({ locale, namespace: "Common.offersPage" }),
    resolveCurrentLocation(locale).then(async (city) => {
      const cityId = getCanonicalBackendCityId(city);
      const offers = await getOffersData({ locale, cityId, page: 1 });
      return { offers, cityId };
    }),
    getCurrentUser(),
  ]);
  const empty =
    offers.coupons.length === 0 && offers.discountedProducts.items.length === 0;
  return (
    <Container className="main-content-spacing">
      <Breadcrumbs
        label={t("breadcrumbs.label")}
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.offers") },
        ]}
      />
      <div className="mt-5 space-y-2">
        <h1 className="text-h1 font-bold text-foreground">{t("title")}</h1>
        <p className="type-body text-gray-600">{t("description")}</p>
      </div>
      <div className="mt-8 space-y-10">
        {empty ? (
          <EmptyState
            role="status"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          >
            <Link
              href="/products"
              className={buttonVariants({ className: "mt-5" })}
            >
              {t("emptyCta")}
            </Link>
          </EmptyState>
        ) : (
          <>
            <CouponsSection coupons={offers.coupons} locale={locale} />
            <OffersProductListing
              key={JSON.stringify([user?.id ?? null, locale, cityId])}
              cityId={cityId}
              listing={offers.discountedProducts}
              locale={locale}
              accountId={user?.id ?? null}
            />
          </>
        )}
      </div>
    </Container>
  );
}
