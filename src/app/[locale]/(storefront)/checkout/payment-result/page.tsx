import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getAccessToken } from "@/features/auth/server/auth-session";
import { GuestPaymentResult } from "@/features/checkout/components/guest-payment-result";
import { PaymentResultView, type PaymentResultCopy } from "@/features/checkout/components/payment-result-view";
import { readAuthenticatedPaymentResult } from "@/features/checkout/server/payment-result";
import { parsePaymentReturn } from "@/features/checkout/utils/payment-result";

// Private results and upstream order reads must be fresh on every request.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function PaymentResultPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, locale, t] = await Promise.all([
    searchParams, getLocale(), getTranslations("Common.paymentResult"),
  ]);
  const paymentReturn = parsePaymentReturn(query);
  const copy: PaymentResultCopy = {
    states: {
      confirmed: { title: t("confirmed.title"), description: t("confirmed.description") },
      failed: { title: t("failed.title"), description: t("failed.description") },
      pending: { title: t("pending.title"), description: t("pending.description") },
      unavailable: { title: t("unavailable.title"), description: t("unavailable.description") },
      invalid: { title: t("invalid.title"), description: t("invalid.description") },
      checking: { title: t("checking.title"), description: t("checking.description") },
    },
    orderNumber: t("orderNumber"), reportedFailed: t("reportedFailed"),
    details: t("details"), lookup: t("lookup"), store: t("store"), support: t("support"), recheck: t("recheck"),
  };
  let content;
  if (!paymentReturn) {
    content = <PaymentResultView copy={copy} state="invalid" paymentReturn={null} />;
  } else if (!(await getAccessToken())) {
    content = <GuestPaymentResult key={`${locale}:${paymentReturn.orderNumber}:${paymentReturn.status}`}
      locale={locale} paymentReturn={paymentReturn} copy={copy} />;
  } else {
    const result = await readAuthenticatedPaymentResult(locale, paymentReturn.orderNumber);
    content = (
      <PaymentResultView copy={copy} state={result.state} paymentReturn={paymentReturn}
        detailsHref={result.authorized ? `/account/orders/${encodeURIComponent(paymentReturn.orderNumber)}` : undefined}>
        <form method="get" action={`/${locale}/checkout/payment-result`}>
          <input type="hidden" name="status" value={paymentReturn.status} />
          <input type="hidden" name="order_number" value={paymentReturn.orderNumber} />
          <Button type="submit" variant="outline" className="w-full">{copy.recheck}</Button>
        </form>
      </PaymentResultView>
    );
  }
  return <Container className="main-content-spacing bg-gray-50 py-12 sm:py-16">{content}</Container>;
}
