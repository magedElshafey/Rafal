import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import {
  getAddressPage,
  isRecoverableAddressListError,
} from "@/features/addresses/server/address-boundary";
import type { Address } from "@/features/addresses/types/address.types";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getCurrentCart } from "@/features/cart/server/cart-boundary";
import {
  CheckoutPage,
  type CheckoutPageCopy,
} from "@/features/checkout/components/checkout-page";
import type { CheckoutDestination } from "@/features/checkout/types/checkout.types";

export const metadata: Metadata = { robots: { index: false, follow: false } };

function parseBackendId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function savedDestination(
  address: Address,
): Extract<CheckoutDestination, { kind: "saved-address" }> | null {
  const addressId = parseBackendId(address.id);
  return addressId
    ? { kind: "saved-address", addressId, cityId: address.city.id }
    : null;
}

async function readAddresses(
  locale: Awaited<ReturnType<typeof getLocale>>,
): Promise<{ addresses: readonly Address[]; unavailable: boolean }> {
  try {
    const page = await getAddressPage(locale, 1);
    return { addresses: page.items, unavailable: false };
  } catch (error) {
    if (isRecoverableAddressListError(error)) {
      return { addresses: [], unavailable: true };
    }
    throw error;
  }
}

export default async function CheckoutRoute() {
  const locale = await getLocale();
  const [cart, user, t] = await Promise.all([
    getCurrentCart(locale),
    getCurrentUser(),
    getTranslations({ locale, namespace: "Common.checkoutPage" }),
  ]);
  const giftRecipient = cart.gift.isGift ? cart.gift.recipient : null;
  const addressState =
    user && !giftRecipient
      ? await readAddresses(locale)
      : { addresses: [], unavailable: false };

  let initialDestination: CheckoutDestination | null = null;
  if (giftRecipient) {
    initialDestination = {
      kind: "gift-recipient",
      recipient: {
        recipientName: giftRecipient.name,
        recipientPhone: giftRecipient.phone,
        cityId: giftRecipient.city.id,
        district: giftRecipient.district,
        streetDetails: giftRecipient.streetDetails,
      },
    };
  } else {
    const preferredAddresses = [
      ...addressState.addresses.filter((address) => address.isDefault),
      ...addressState.addresses.filter((address) => !address.isDefault),
    ];
    for (const address of preferredAddresses) {
      initialDestination = savedDestination(address);
      if (initialDestination) break;
    }
  }

  const copy: CheckoutPageCopy = {
    title: t("title"),
    emptyCart: {
      title: t("emptyCart.title"),
      description: t("emptyCart.description"),
      action: t("emptyCart.action"),
    },
    destination: {
      title: t("destination.title"),
      gift: {
        label: t("destination.gift.label"),
        description: t("destination.gift.description"),
        editor: {
          edit: t("destination.gift.edit"),
          title: t("destination.gift.editor.title"),
          close: t("destination.gift.editor.close"),
          save: t("destination.gift.editor.save"),
          saving: t("destination.gift.editor.saving"),
          cancel: t("destination.gift.editor.cancel"),
          required: t("destination.errors.required"),
          invalidPhone: t("destination.errors.invalidPhone"),
          validationError: t("destination.gift.editor.validationError"),
          sessionError: t("destination.gift.editor.sessionError"),
          serviceError: t("destination.gift.editor.serviceError"),
          fields: {
            name: t("destination.fields.recipientName"),
            phone: t("destination.fields.recipientPhone"),
            city: t("destination.fields.city"),
            district: t("destination.fields.district"),
            streetDetails: t("destination.fields.streetDetails"),
            selectCity: t("destination.cityOptions.select"),
            cityDialog: {
              title: t("destination.gift.editor.cityDialog.title"),
              description: t(
                "destination.gift.editor.cityDialog.description",
              ),
              loading: t("destination.cityOptions.loading"),
              empty: t("destination.cityOptions.empty"),
              unavailable: t("destination.cityOptions.unavailable"),
              close: t("destination.gift.editor.cityDialog.close"),
              searchLabel: t(
                "destination.gift.editor.cityDialog.searchLabel",
              ),
              searchPlaceholder: t(
                "destination.gift.editor.cityDialog.searchPlaceholder",
              ),
              searchNoResults: t(
                "destination.gift.editor.cityDialog.searchNoResults",
              ),
            },
          },
        },
      },
      saved: {
        title: t("destination.saved.title"),
        defaultLabel: t("destination.saved.defaultLabel"),
        unavailable: t("destination.saved.unavailable"),
      },
      oneTime: {
        show: t("destination.oneTime.show"),
        hide: t("destination.oneTime.hide"),
        committed: t("destination.oneTime.committed"),
        submit: t("destination.oneTime.submit"),
      },
      fields: {
        recipientName: t("destination.fields.recipientName"),
        recipientPhone: t("destination.fields.recipientPhone"),
        city: t("destination.fields.city"),
        district: t("destination.fields.district"),
        streetDetails: t("destination.fields.streetDetails"),
      },
      cityOptions: {
        select: t("destination.cityOptions.select"),
        loading: t("destination.cityOptions.loading"),
        empty: t("destination.cityOptions.empty"),
        unavailable: t("destination.cityOptions.unavailable"),
        retry: t("destination.cityOptions.retry"),
      },
      errors: {
        required: t("destination.errors.required"),
        invalidPhone: t("destination.errors.invalidPhone"),
        validation: t("destination.errors.validation"),
      },
    },
    shipping: {
      title: t("shipping.title"),
      waiting: t("shipping.waiting"),
      loading: t("shipping.loading"),
      retry: t("shipping.retry"),
      refreshing: t("shipping.refreshing"),
      free: t("shipping.free"),
      error: {
        title: t("shipping.error.title"),
        description: t("shipping.error.description"),
      },
      coverage: {
        title: t("shipping.coverage.title"),
        description: t("shipping.coverage.description"),
      },
      unavailable: {
        title: t("shipping.unavailable.title"),
        description: t("shipping.unavailable.description"),
        line: t.raw("shipping.unavailable.line"),
        backToCart: t("shipping.unavailable.backToCart"),
      },
      noOptions: {
        title: t("shipping.noOptions.title"),
        description: t("shipping.noOptions.description"),
      },
    },
    summary: {
      title: t("summary.title"),
      waiting: t("summary.waiting"),
      unavailable: t("summary.unavailable"),
      subtotal: t("summary.subtotal"),
      productDiscount: t("summary.productDiscount"),
      personalization: t("summary.personalization"),
      giftWrap: t("summary.giftWrap"),
      shipping: t("summary.shipping"),
      shippingPending: t("summary.shippingPending"),
      couponDiscount: t("summary.couponDiscount"),
      vat: t.raw("summary.vat"),
      total: t("summary.total"),
      quantity: t("summary.quantity"),
      personalizedWith: t("summary.personalizedWith"),
      products: t("summary.products"),
    },
  };

  return (
    <Container className="main-content-spacing pb-12 lg:px-[3.75rem]">
      <CheckoutPage
        addresses={addressState.addresses}
        addressesUnavailable={addressState.unavailable}
        cartEmpty={cart.lines.length === 0}
        copy={copy}
        initialGift={giftRecipient ? cart.gift : null}
        initialDestination={initialDestination}
        isAuthenticated={user !== null}
        summaryItems={cart.lines.map((line) => ({
          id: line.id,
          imageSrc: line.product.image?.src ?? null,
          lineTotal: line.lineTotal,
          name: line.product.name,
          personalizationText: line.personalization?.text ?? null,
          productSlug: line.product.slug,
          quantity: line.quantity,
          variantAttributes: Object.entries(line.variant.attributes).map(
            ([name, value]) => ({ name, value: String(value) }),
          ),
        }))}
        locale={locale}
      />
    </Container>
  );
}
