import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getCurrentCart } from "@/features/cart/server/cart-boundary";
import { CartPage } from "@/features/cart/components/cart-page";
import { readGuestCityId } from "@/features/location/server/guest-city-session";
import { getOffersData } from "@/features/offers/api/get-offers-data";
import { getPublicSettings } from "@/features/settings/server/public-settings-boundary";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CartRoute() {
  const locale = await getLocale();
  const selectedCityId = await readGuestCityId();
  const userPromise = getCurrentUser();
  const couponDiscoveryPromise = userPromise.then(async (user) => {
    if (!user) return { coupons: [], failed: false } as const;
    try {
      const offers = await getOffersData({
        locale,
        cityId: selectedCityId,
        page: 1,
      });
      return { coupons: offers.coupons, failed: false } as const;
    } catch {
      return { coupons: [], failed: true } as const;
    }
  });
  const [cart, settings, t, user, couponDiscovery] = await Promise.all([
    getCurrentCart(locale, selectedCityId ?? undefined),
    getPublicSettings(),
    getTranslations({ locale, namespace: "Common.cartPage" }),
    userPromise,
    couponDiscoveryPromise,
  ]);

  return (
    <Container className="main-content-spacing pb-12 lg:px-[3.75rem]">
      <Breadcrumbs className="mb-6" label={t("breadcrumbs.label")} items={[{ label: t("breadcrumbs.home"), href: "/" }, { label: t("title") }]} />
      <CartPage
        canUseCoupons={user !== null}
        availableCoupons={couponDiscovery.coupons}
        couponDiscoveryFailed={couponDiscovery.failed}
        initialCart={cart}
        locale={locale}
        maxQuantity={settings.maxCartItemQuantity}
        selectedCityId={selectedCityId}
        copy={{
          title: t("title"), emptyTitle: t("empty.title"), emptyDescription: t("empty.description"), continueShopping: t("empty.continueShopping"),
          clear: t("actions.clear"), clearing: t("actions.clearing"), remove: t("actions.remove"), removing: t("actions.removing"),
          increase: t("quantity.increase"), decrease: t("quantity.decrease"), quantity: t("quantity.label"), unitPrice: t("line.unitPrice"), lineTotal: t("line.total"), personalization: t("line.personalization"), sku: t("line.sku"),
          stock: { ok: t("stock.ok"), low: t("stock.low"), outOfStock: t("stock.outOfStock") },
          summary: t("summary.title"), subtotal: t("summary.subtotal"), productDiscount: t("summary.productDiscount"), personalizationTotal: t("summary.personalization"), giftWrap: t("summary.giftWrap"), shipping: t("summary.shipping"), couponDiscount: t("summary.couponDiscount"), vatIncluded: t("summary.vatIncluded"), total: t("summary.total"), checkout: t("summary.checkout"), freeShippingQualified: t("summary.freeShippingQualified"), freeShippingRemaining: t("summary.freeShippingRemaining"),
          availability: { unavailable: t("availability.unavailable"), unconfirmed: t("availability.unconfirmed"), checkoutUnavailable: t("availability.checkoutUnavailable") },
          coupon: { label: t("coupon.label"), codeLabel: t("coupon.codeLabel"), codePlaceholder: t("coupon.codePlaceholder"), apply: t("coupon.apply"), applyAction: t("coupon.applyAction"), applying: t("coupon.applying"), remove: t("coupon.remove"), removeAction: t("coupon.removeAction"), removing: t("coupon.removing"), available: t("coupon.available"), invalid: t("coupon.invalid"), serviceError: t("coupon.serviceError"), discoveryError: t("coupon.discoveryError"), sessionExpired: t("coupon.sessionExpired"), applied: t("coupon.applied"), minimumOrder: t("coupon.minimumOrder"), maximumDiscount: t("coupon.maximumDiscount"), expires: t("coupon.expires") },
          errors: { generic: t("errors.generic"), validation: t("errors.validation"), notFound: t("errors.notFound"), retry: t("errors.retry") },
        }}
      />
    </Container>
  );
}
