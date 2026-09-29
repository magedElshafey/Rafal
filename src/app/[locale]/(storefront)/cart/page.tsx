import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getCurrentCart } from "@/features/cart/server/cart-boundary";
import { CartPage } from "@/features/cart/components/cart-page";
import { getPublicSettings } from "@/features/settings/server/public-settings-boundary";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CartRoute() {
  const locale = await getLocale();
  const [cart, settings, t, user] = await Promise.all([
    getCurrentCart(locale),
    getPublicSettings(),
    getTranslations({ locale, namespace: "Common.cartPage" }),
    getCurrentUser(),
  ]);

  return (
    <Container className="main-content-spacing pb-12">
      <Breadcrumbs
        className="mb-6"
        label={t("breadcrumbs.label")}
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("title") },
        ]}
      />
      <CartPage
        canUseCoupons={user !== null}
        initialCart={cart}
        locale={locale}
        maxQuantity={settings.maxCartItemQuantity}
        copy={{
          title: t("title"),
          emptyTitle: t("empty.title"),
          emptyDescription: t("empty.description"),
          continueShopping: t("empty.continueShopping"),
          clear: t("actions.clear"),
          clearing: t("actions.clearing"),
          remove: t("actions.remove"),
          removing: t("actions.removing"),
          increase: t("quantity.increase"),
          decrease: t("quantity.decrease"),
          quantity: t("quantity.label"),
          unitPrice: t("line.unitPrice"),
          lineTotal: t("line.total"),
          personalization: t("line.personalization"),
          sku: t("line.sku"),
          stock: {
            ok: t("stock.ok"),
            low: t("stock.low"),
            outOfStock: t("stock.outOfStock"),
          },
          summary: t("summary.title"),
          subtotal: t("summary.subtotal"),
          productDiscount: t("summary.productDiscount"),
          personalizationTotal: t("summary.personalization"),
          giftWrap: t("summary.giftWrap"),
          shipping: t("summary.shipping"),
          couponDiscount: t("summary.couponDiscount"),
          vatIncluded: t("summary.vatIncluded"),
          total: t("summary.total"),
          checkout: t("summary.checkout"),
          freeShippingQualified: t("summary.freeShippingQualified"),
          freeShippingRemaining: t("summary.freeShippingRemaining"),
          coupon: {
            label: t("coupon.label"),
            codeLabel: t("coupon.codeLabel"),
            codePlaceholder: t("coupon.codePlaceholder"),
            apply: t("coupon.apply"),
            applyAction: t("coupon.applyAction"),
            applying: t("coupon.applying"),
            remove: t("coupon.remove"),
            removeAction: t("coupon.removeAction"),
            removing: t("coupon.removing"),
            available: t("coupon.available"),
            loading: t("coupon.loading"),
            empty: t("coupon.empty"),
            retry: t("coupon.retry"),
            invalid: t("coupon.invalid"),
            serviceError: t("coupon.serviceError"),
            sessionExpired: t("coupon.sessionExpired"),
            applied: t("coupon.applied"),
            estimatedDiscount: t("coupon.estimatedDiscount"),
            minimumOrder: t("coupon.minimumOrder"),
          },
          errors: {
            generic: t("errors.generic"),
            validation: t("errors.validation"),
            notFound: t("errors.notFound"),
            retry: t("errors.retry"),
          },
        }}
      />
    </Container>
  );
}
