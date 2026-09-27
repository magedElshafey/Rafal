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
    <Container className="main-content-spacing pb-12 lg:px-[3.75rem]">
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
        giftWrapEnabled={settings.giftWrapEnabled}
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
          gift: {
            title: t("gift.title"),
            description: t("gift.description"),
            giftWrap: t("gift.giftWrap"),
            giftWrapDescription: t("gift.giftWrapDescription"),
            giftWrapUnavailable: t("gift.giftWrapUnavailable"),
            sendAsGift: t("gift.sendAsGift"),
            sendAsGiftDescription: t("gift.sendAsGiftDescription"),
            updating: t("gift.updating"),
            recipientTitle: t("gift.recipientTitle"),
            name: t("gift.name"),
            phone: t("gift.phone"),
            city: t("gift.city"),
            district: t("gift.district"),
            streetDetails: t("gift.streetDetails"),
            selectCity: t("gift.selectCity"),
            changeCity: t("gift.changeCity"),
            save: t("gift.save"),
            update: t("gift.update"),
            saving: t("gift.saving"),
            cancel: t("gift.cancel"),
            required: t("gift.required"),
            validationError: t("gift.validationError"),
            serviceError: t("gift.serviceError"),
            sessionError: t("gift.sessionError"),
            cityDialog: {
              title: t("gift.cityDialog.title"),
              description: t("gift.cityDialog.description"),
              loading: t("gift.cityDialog.loading"),
              empty: t("gift.cityDialog.empty"),
              unavailable: t("gift.cityDialog.unavailable"),
              close: t("gift.cityDialog.close"),
              searchLabel: t("gift.cityDialog.searchLabel"),
              searchPlaceholder: t("gift.cityDialog.searchPlaceholder"),
              searchNoResults: t("gift.cityDialog.searchNoResults"),
            },
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
