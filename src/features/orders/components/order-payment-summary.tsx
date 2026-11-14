import { useTranslations, type Locale } from "next-intl";
import { CrownIcon } from "@/components/ui/icons/interface-icons";

import type { OrderDetails } from "@/features/orders/types/order.types";
import {
  formatOrderDateTime,
  formatOrderDate,
  formatOrderMoney,
} from "@/features/orders/utils/order-formatters";

type OrderPaymentSummaryProps = {
  locale: Locale;
  methodLabel: string;
  methodLabels: Readonly<Record<string, string>>;
  money: OrderDetails["money"];
  loyalty?: OrderDetails["loyalty"];
  paidAtLabel: string;
  payment: OrderDetails["payment"];
  statusLabel: string;
  statusLabels: Readonly<Record<string, string>>;
  title: string;
  totalLabel: string;
};

function presentationLabel(
  value: string,
  labels: Readonly<Record<string, string>>,
): string {
  const normalized = value.trim().toLowerCase();
  return labels[normalized] ?? value.replace(/[_-]+/g, " ");
}

export function OrderPaymentSummary({
  locale,
  methodLabel,
  methodLabels,
  money,
  loyalty,
  paidAtLabel,
  payment,
  statusLabel,
  statusLabels,
  title,
  totalLabel,
}: OrderPaymentSummaryProps) {
  const normalizedStatus = payment.status.trim().toLowerCase();
  const t = useTranslations("Account.orders.details.loyalty");
  const number = new Intl.NumberFormat(locale);
  const earned = loyalty?.pointsEarned;
  const earnedLabel = loyalty?.earnedStatus === null ? "expected"
    : loyalty?.earnedStatus === "pending" ? "pending"
    : loyalty?.earnedStatus === "cancelled" ? "cancelled" : "unknown";

  return (
    <section className="h-full rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{title}</h2>
      <dl className="mt-4 space-y-3 type-body">
        {payment.method ? (
          <div className="flex items-start justify-between gap-4">
            <dt className="text-gray-500">{methodLabel}</dt>
            <dd className="text-end font-medium text-gray-700">
              <bdi>{presentationLabel(payment.method, methodLabels)}</bdi>
            </dd>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-4">
          <dt className="text-gray-500">{statusLabel}</dt>
          <dd
            className={`text-end font-medium ${
              normalizedStatus === "paid" ? "text-success" : "text-gray-700"
            }`}
          >
            <bdi>{presentationLabel(payment.status, statusLabels)}</bdi>
          </dd>
        </div>
        {payment.paidAt ? (
          <div className="flex items-start justify-between gap-4 type-body-sm">
            <dt className="text-gray-500">{paidAtLabel}</dt>
            <dd className="text-end text-gray-600">
              <time dateTime={payment.paidAt}>
                {formatOrderDateTime(locale, payment.paidAt)}
              </time>
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4 text-h4 font-bold text-gray-1000">
          <dt>{totalLabel}</dt>
          <dd className="min-w-0 break-words text-end">
            <bdi>{formatOrderMoney(locale, money.total, money.currency)}</bdi>
          </dd>
        </div>
        {loyalty ? [
          { label: t("redeemed"), value: loyalty.pointsRedeemed === null ? null : number.format(loyalty.pointsRedeemed) },
          { label: t("applied"), value: loyalty.amountApplied === null ? null : formatOrderMoney(locale, loyalty.amountApplied, money.currency) },
          { label: t("due"), value: loyalty.amountDue === null ? null : formatOrderMoney(locale, loyalty.amountDue, money.currency) },
        ].map(row => row.value === null ? null : (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <dt className="min-w-0 text-gray-500">{row.label}</dt>
            <dd className="min-w-0 break-words text-end font-medium"><bdi>{row.value}</bdi></dd>
          </div>
        )) : null}
      </dl>
      {earned != null && earned > 0 ? (
        <div className="mt-5 flex items-start gap-2 rounded-md bg-gold-50 p-3 type-body-sm text-gray-700">
          <CrownIcon aria-hidden="true" className="size-4 shrink-0 text-gold-600" />
          <div className="min-w-0 break-words">
            <p>{t.rich(earnedLabel, { points: number.format(earned), value: chunks => <bdi>{chunks}</bdi> })}</p>
            {loyalty?.earnedStatus === "pending" ? (
              loyalty.availableOn ? <p className="mt-1">{t("availableOn")} <time dateTime={loyalty.availableOn}>{formatOrderDate(locale, loyalty.availableOn)}</time></p>
                : loyalty.returnWindowDays !== null ? <p className="mt-1">{t("window", { days: number.format(loyalty.returnWindowDays) })}</p> : null
            ) : null}
          </div>
        </div>
      ) : null}
      {loyalty?.pointsReturned != null && loyalty.pointsReturned > 0 ? (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-gold-50 p-3 type-body-sm text-gray-700">
          <CrownIcon aria-hidden="true" className="size-4 shrink-0 text-gold-600" />
          <span className="min-w-0 break-words">{t.rich("returned", { points: number.format(loyalty.pointsReturned), value: chunks => <bdi>{chunks}</bdi> })}</span>
        </p>
      ) : null}
    </section>
  );
}
