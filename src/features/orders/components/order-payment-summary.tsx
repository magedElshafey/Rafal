import type { Locale } from "next-intl";

import type {
  OrderPaymentMethod,
  OrderPaymentSummary as OrderPaymentSummaryData,
} from "@/features/orders/types/order.types";
import { formatOrderMoney } from "@/features/orders/utils/order-formatters";

type OrderPaymentSummaryProps = {
  locale: Locale;
  methodLabel: string;
  methodLabels: Record<OrderPaymentMethod, string>;
  payment: OrderPaymentSummaryData;
  title: string;
  totalLabel: string;
};

export function OrderPaymentSummary({
  locale,
  methodLabel,
  methodLabels,
  payment,
  title,
  totalLabel,
}: OrderPaymentSummaryProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{title}</h2>
      <dl className="mt-4 space-y-3 type-body">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-gray-500">{methodLabel}</dt>
          <dd className="font-medium text-gray-700">
            {methodLabels[payment.method]}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 font-bold">
          <dt>{totalLabel}</dt>
          <dd className="text-success">
            <bdi>{formatOrderMoney(locale, payment.total, payment.currency)}</bdi>
          </dd>
        </div>
      </dl>
    </section>
  );
}
