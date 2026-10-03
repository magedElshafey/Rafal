import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import {
  CheckoutConfirmation,
  type CheckoutConfirmationCopy,
} from "@/features/checkout/components/checkout-confirmation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const [{ orderNumber }, locale, t] = await Promise.all([
    params,
    getLocale(),
    getTranslations("Common.checkoutConfirmation"),
  ]);
  const copy: CheckoutConfirmationCopy = {
    title: t("title"),
    orderNumber: t("orderNumber"),
    description: t("description"),
    shippingAddress: t("shippingAddress"),
    total: t("total"),
    continueShopping: t("continueShopping"),
    missingTitle: t("missingTitle"),
    missingDescription: t("missingDescription"),
  };

  return (
    <Container className="main-content-spacing bg-gray-50 py-12 sm:py-16">
      <CheckoutConfirmation
        copy={copy}
        locale={locale}
        orderNumber={orderNumber}
      />
    </Container>
  );
}
