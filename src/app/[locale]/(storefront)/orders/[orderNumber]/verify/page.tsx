import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import {
  CheckoutVerificationHandoff,
  type CheckoutVerificationCopy,
} from "@/features/checkout/components/checkout-verification-handoff";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderVerificationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const [{ orderNumber }, t] = await Promise.all([
    params,
    getTranslations("Common.checkoutVerification"),
  ]);
  const copy: CheckoutVerificationCopy = {
    title: t("title"),
    description: t("description"),
    sentTo: t("sentTo"),
    orderNumber: t("orderNumber"),
    foundation: t("foundation"),
    missingTitle: t("missingTitle"),
    missingDescription: t("missingDescription"),
    returnToCheckout: t("returnToCheckout"),
  };

  return (
    <Container className="main-content-spacing bg-gray-50 py-12 sm:py-16">
      <CheckoutVerificationHandoff copy={copy} orderNumber={orderNumber} />
    </Container>
  );
}
