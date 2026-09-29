import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import {
  getAddressPage,
  isRecoverableAddressListError,
} from "@/features/addresses/server/address-boundary";
import type { Address } from "@/features/addresses/types/address.types";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { resolveCartTransportIdentity } from "@/features/cart/server/cart-auth-context";
import { getCurrentCart } from "@/features/cart/server/cart-boundary";
import type { CartGiftRecipient } from "@/features/cart/types/cart.types";
import type { CheckoutDestination } from "@/features/checkout/components/checkout-destination.types";
import { CheckoutFlow } from "@/features/checkout/components/checkout-flow";
import { quoteCurrentCheckout } from "@/features/checkout/server/checkout-boundary";
import { mapCheckoutQuoteError } from "@/features/checkout/server/checkout-quote-error";
import type {
  CheckoutQuote,
  CheckoutQuoteError,
  CheckoutQuoteRequest,
} from "@/features/checkout/types/checkout.types";
import { parseCheckoutBackendId } from "@/features/checkout/utils/checkout-backend-id";
import { redirect } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function getAllAddresses(locale: Locale): Promise<readonly Address[]> {
  const first = await getAddressPage(locale, 1);
  if (first.pagination.lastPage <= 1) return first.items;

  const remaining = await Promise.all(
    Array.from(
      { length: first.pagination.lastPage - 1 },
      (_, index) => getAddressPage(locale, index + 2),
    ),
  );

  return [first, ...remaining].flatMap((page) => page.items);
}

function giftRequest(recipient: CartGiftRecipient): CheckoutQuoteRequest {
  return {
    cityId: recipient.city.id,
    address: {
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      district: recipient.district,
      streetDetails: recipient.streetDetails,
    },
  };
}

async function getInitialQuote(
  locale: Locale,
  request: CheckoutQuoteRequest,
): Promise<{
  quote: CheckoutQuote | null;
  error: CheckoutQuoteError | null;
}> {
  try {
    return {
      quote: await quoteCurrentCheckout(locale, request),
      error: null,
    };
  } catch (error) {
    return { quote: null, error: mapCheckoutQuoteError(error) };
  }
}

export default async function CheckoutRoute() {
  const locale = await getLocale();
  const [cart, user, cartIdentity] = await Promise.all([
    getCurrentCart(locale),
    getCurrentUser(),
    resolveCartTransportIdentity(),
  ]);

  if (
    cart.lines.length === 0 ||
    (cartIdentity.kind === "guest" && !cartIdentity.token)
  ) {
    redirect({ href: "/cart", locale });
  }

  const [t, cartT] = await Promise.all([
    getTranslations({ locale, namespace: "Common.checkoutPage" }),
    getTranslations({ locale, namespace: "Common.cartPage" }),
  ]);

  let addresses: readonly Address[] = [];
  let addressListUnavailable = false;
  let initialDestination: CheckoutDestination = { kind: "none" };

  if (cart.gift.isGift) {
    initialDestination = cart.gift.recipient
      ? {
          kind: "gift",
          recipient: cart.gift.recipient,
          request: giftRequest(cart.gift.recipient),
        }
      : { kind: "gift-missing" };
  } else if (user) {
    try {
      addresses = (await getAllAddresses(locale)).filter(
        (address) => parseCheckoutBackendId(address.id) !== null,
      );
      const selected =
        addresses.find((address) => address.isDefault) ?? addresses[0];
      const addressId = selected
        ? parseCheckoutBackendId(selected.id)
        : null;

      if (selected && addressId !== null) {
        initialDestination = {
          kind: "saved",
          addressId: selected.id,
          request: {
            cityId: selected.city.id,
            addressId,
          },
        };
      }
    } catch (error) {
      if (!isRecoverableAddressListError(error)) throw error;
      addressListUnavailable = true;
    }
  }

  const initial =
    "request" in initialDestination
      ? await getInitialQuote(locale, initialDestination.request)
      : { quote: null, error: null };

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
      <CheckoutFlow
        addressListUnavailable={addressListUnavailable}
        addresses={addresses}
        cart={cart}
        initialDestination={initialDestination}
        initialQuote={initial.quote}
        initialQuoteError={initial.error}
        locale={locale}
        copy={{
          title: t("title"),
          inactiveStep: t("steps.inactive"),
          shippingStep: t("steps.shipping"),
          paymentStep: t("steps.payment"),
          destination: {
            stepTitle: t("steps.address"),
            selectedLabel: t("destination.selectedLabel"),
            defaultLabel: t("destination.defaultLabel"),
            giftLabel: t("destination.giftLabel"),
            oneTimeLabel: t("destination.oneTimeLabel"),
            addNew: t("destination.addNew"),
            editAddress: t("destination.editAddress"),
            savedUnavailable: t("destination.savedUnavailable"),
            giftMissingTitle: t("destination.giftMissingTitle"),
            giftMissingDescription: t(
              "destination.giftMissingDescription",
            ),
            editGift: t("destination.editGift"),
            feedback: {
              pending: t("destination.feedback.pending"),
              coverageTitle: t("destination.feedback.coverageTitle"),
              coverageDescription: t(
                "destination.feedback.coverageDescription",
              ),
              changeAddress: t("destination.feedback.changeAddress"),
              unfulfillableTitle: t(
                "destination.feedback.unfulfillableTitle",
              ),
              unfulfillableDescription: t(
                "destination.feedback.unfulfillableDescription",
              ),
              returnToCart: t("destination.feedback.returnToCart"),
              quoteError: t("destination.feedback.quoteError"),
              sessionError: t("destination.feedback.sessionError"),
              validationError: t(
                "destination.feedback.validationError",
              ),
              retry: t("destination.feedback.retry"),
            },
            form: {
              fields: {
                recipientName: t(
                  "destination.form.fields.recipientName",
                ),
                recipientPhone: t(
                  "destination.form.fields.recipientPhone",
                ),
                city: t("destination.form.fields.city"),
                district: t("destination.form.fields.district"),
                streetDetails: t(
                  "destination.form.fields.streetDetails",
                ),
              },
              cityPicker: {
                select: t("destination.form.cityPicker.select"),
                title: t("destination.form.cityPicker.title"),
                description: t(
                  "destination.form.cityPicker.description",
                ),
                loading: t("destination.form.cityPicker.loading"),
                empty: t("destination.form.cityPicker.empty"),
                unavailable: t(
                  "destination.form.cityPicker.unavailable",
                ),
                retry: t("destination.form.cityPicker.retry"),
                close: t("destination.form.cityPicker.close"),
                searchLabel: t(
                  "destination.form.cityPicker.searchLabel",
                ),
                searchPlaceholder: t(
                  "destination.form.cityPicker.searchPlaceholder",
                ),
                searchNoResults: t(
                  "destination.form.cityPicker.searchNoResults",
                ),
              },
              useAddress: t("destination.form.useAddress"),
              usingAddress: t("destination.form.usingAddress"),
              cancel: t("destination.form.cancel"),
              required: t("destination.form.required"),
              validationError: t(
                "destination.form.validationError",
              ),
            },
          },
          summary: {
            title: cartT("summary.title"),
            quantity: cartT("quantity.label"),
            personalization: cartT("line.personalization"),
            subtotal: cartT("summary.subtotal"),
            productDiscount: cartT("summary.productDiscount"),
            personalizationTotal: cartT("summary.personalization"),
            giftWrap: cartT("summary.giftWrap"),
            shipping: cartT("summary.shipping"),
            couponDiscount: cartT("summary.couponDiscount"),
            vatIncluded: cartT("summary.vatIncluded"),
            total: cartT("summary.total"),
          },
        }}
      />
    </Container>
  );
}