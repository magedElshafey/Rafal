import { useTranslations, type Locale } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { CheckoutQuoteTotals } from "../types/checkout.types";

export function CheckoutLoyalty({ locale, loyalty, checked, loading, locked, hasDestination, error, maxRedeemPercent, onChange, onRetry }: {
  locale: Locale;
  loyalty: CheckoutQuoteTotals["loyalty"];
  checked: boolean;
  loading: boolean;
  locked: boolean;
  hasDestination: boolean;
  error: boolean;
  maxRedeemPercent: number | null;
  onChange: (checked: boolean) => void;
  onRetry: () => void;
}) {
  const t = useTranslations("Common.checkoutPage.loyalty");
  const number = new Intl.NumberFormat(locale);
  const reason = loyalty?.disabledReason;
  const disabled = loading || locked || (!checked && (!loyalty || reason !== null || loyalty.usable <= 0));
  return <section className="mt-5 rounded-lg bg-gold-50 p-4" aria-labelledby="checkout-loyalty-title" aria-busy={loading}>
    <div className="flex items-center justify-between gap-3">
      <h3 id="checkout-loyalty-title" className="type-body font-medium">{t("title")}</h3>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-labelledby="checkout-loyalty-title" aria-describedby="checkout-loyalty-description" />
    </div>
    <div id="checkout-loyalty-description" className="mt-2 min-h-16 space-y-2 type-body-sm text-gray-700" aria-live="polite">
      {loading ? <><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /></> : error ? (
        <><p>{t("error")}</p><Button size="sm" variant="ghost" onClick={onRetry}>{t("retry")}</Button></>
      ) : !loyalty ? <p>{t(hasDestination ? "unavailable" : "waiting")}</p> : <>
        <p>{t.rich("balance", { available: number.format(loyalty.available), usable: number.format(loyalty.usable), value: chunks => <bdi>{chunks}</bdi> })}</p>
        {reason !== null ? <p>{t(reason === "min_not_reached" ? "minimum" : reason === "pending_order" ? "held" : "unavailable")}</p> : null}
        {loyalty.pointsUsed > 0 ? <p className="text-gold-700">{t.rich("applied", { points: number.format(loyalty.pointsUsed), amount: new Intl.NumberFormat(locale, { style: "currency", currency: "SAR" }).format(Number(loyalty.amountApplied)), value: chunks => <bdi>{chunks}</bdi> })}</p> : null}
        {maxRedeemPercent !== null ? <p className="type-caption">{t("maximum", { percent: number.format(maxRedeemPercent) })}</p> : null}
      </>}
    </div>
  </section>;
}
