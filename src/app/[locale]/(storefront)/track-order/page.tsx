import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { GuestOrderLookup } from "@/features/orders/components/guest-order-lookup";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Common.guestOrderTracking");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export default async function GuestOrderTrackingPage() {
  const t = await getTranslations("Common.guestOrderTracking");

  return (
    <Container size="default" className="pb-12 md:pb-16">
      <header className="mx-auto mb-7 max-w-2xl text-center">
        <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
        <p className="mt-2 type-body text-gray-600">{t("description")}</p>
      </header>
      <GuestOrderLookup />
    </Container>
  );
}
