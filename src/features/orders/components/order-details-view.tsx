import type { Locale } from "next-intl";

import { ChevronLeftIcon } from "@/components/ui/icons";
import { OrderAddress } from "@/features/orders/components/order-address";
import { OrderItems } from "@/features/orders/components/order-items";
import { OrderPaymentSummary } from "@/features/orders/components/order-payment-summary";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import type { OrderDetails } from "@/features/orders/types/order.types";
import { formatOrderDate } from "@/features/orders/utils/order-formatters";
import { Link } from "@/i18n/navigation";

export type OrderDetailsCopy = Readonly<{
  backToOrders: string;
  orderLabel: string;
  payment: Readonly<{
    method: string;
    methodLabels: Readonly<Record<string, string>>;
    paidAt: string;
    status: string;
    statusLabels: Readonly<Record<string, string>>;
    title: string;
    total: string;
  }>;
  placedAt: (date: string) => string;
  products: Readonly<{
    attributeLabels: Readonly<Record<string, string>>;
    quantity: (count: number) => string;
    title: string;
    unitPrice: string;
  }>;
  shipping: Readonly<{
    address: string;
    method: string;
    phone: string;
    recipient: string;
    title: string;
  }>;
  statusLabels: Readonly<Record<string, string>>;
  timeline: Readonly<{
    pending: string;
    reached: string;
    stageLabels: Readonly<Record<string, string>>;
    title: string;
  }>;
}>;

function normalizedStatus(status: string): string {
  const value = status.trim().toLowerCase();
  if (value === "proccessing") return "processing";
  if (value === "reterned") return "returned";
  if (value === "canceled") return "cancelled";
  return value;
}

function statusLabel(
  status: string,
  labels: Readonly<Record<string, string>>,
): string {
  const normalized = normalizedStatus(status);
  return labels[normalized] ?? status.replace(/[_-]+/g, " ");
}

type OrderDetailsViewProps = {
  copy: OrderDetailsCopy;
  locale: Locale;
  order: OrderDetails;
};

export function OrderDetailsView({
  copy,
  locale,
  order,
}: OrderDetailsViewProps) {
  const customerStatus = normalizedStatus(order.customerStatus);

  return (
    <div className="space-y-5">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1 type-body-sm font-medium text-gray-600 hover:text-gray-1000 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
        {copy.backToOrders}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h2 font-bold text-gray-1000">
            {copy.orderLabel}{" "}
            <bdi dir="ltr">{order.displayNumber}</bdi>
          </h1>
          <p className="mt-1 type-body-sm text-gray-500">
            <time dateTime={order.placedAt}>
              {copy.placedAt(formatOrderDate(locale, order.placedAt))}
            </time>
          </p>
        </div>
        <OrderStatusBadge
          status={customerStatus}
          label={statusLabel(customerStatus, copy.statusLabels)}
        />
      </header>

      <OrderTimeline
        title={copy.timeline.title}
        events={order.timeline}
        stageLabels={copy.timeline.stageLabels}
        reachedLabel={copy.timeline.reached}
        pendingLabel={copy.timeline.pending}
      />

      <OrderItems
        title={copy.products.title}
        items={order.items}
        locale={locale}
        currency={order.money.currency}
        attributeLabels={copy.products.attributeLabels}
        quantityLabel={copy.products.quantity}
        unitPriceLabel={copy.products.unitPrice}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <OrderAddress
          title={copy.shipping.title}
          address={order.shippingAddress}
          addressLabel={copy.shipping.address}
          locale={locale}
          phoneLabel={copy.shipping.phone}
          recipientLabel={copy.shipping.recipient}
          shippingMethod={order.shippingMethod}
          shippingMethodLabel={copy.shipping.method}
        />
        <OrderPaymentSummary
          title={copy.payment.title}
          locale={locale}
          payment={order.payment}
          money={order.money}
          methodLabel={copy.payment.method}
          statusLabel={copy.payment.status}
          paidAtLabel={copy.payment.paidAt}
          totalLabel={copy.payment.total}
          methodLabels={copy.payment.methodLabels}
          statusLabels={copy.payment.statusLabels}
        />
      </div>
    </div>
  );
}
