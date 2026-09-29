import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { CheckoutPageSkeleton } from "@/features/checkout/components/checkout-page-skeleton";

export default async function CheckoutLoading() {
  const t = await getTranslations("Common.checkoutPage");

  return (
    <Container aria-busy="true" size="wide">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <CheckoutPageSkeleton />
    </Container>
  );
}