import type { Locale } from "next-intl";

import type { OrderDetails } from "@/features/orders/types/order.types";
import {
  formatOrderDateTime,
  formatOrderMoney,
} from "@/features/orders/utils/order-formatters";

type OrderPaymentSummaryProps = {
  locale: Locale;
  methodLabel: string;
  methodLabels: Readonly<Record<string, string>>;
  money: OrderDetails["money"];
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
  paidAtLabel,
  payment,
  statusLabel,
  statusLabels,
  title,
  totalLabel,
}: OrderPaymentSummaryProps) {
  const normalizedStatus = payment.status.trim().toLowerCase();

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
          <dd>
            <bdi>{formatOrderMoney(locale, money.total, money.currency)}</bdi>
          </dd>
        </div>
      </dl>
    </section>
  );
}
