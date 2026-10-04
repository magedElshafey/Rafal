import type { ReactNode, Ref } from "react";
import type { Locale } from "next-intl";

import { OrderAddress } from "@/features/orders/components/order-address";
import { OrderItems } from "@/features/orders/components/order-items";
import { OrderPaymentSummary } from "@/features/orders/components/order-payment-summary";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import type { OrderDetails } from "@/features/orders/types/order.types";
import { formatOrderDate } from "@/features/orders/utils/order-formatters";
import type { OrderProductReviewCopy } from "@/features/reviews/components/order-product-review-action";

export type OrderDetailsContentCopy = Readonly<{
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

type OrderDetailsHeaderProps = {
  actions?: ReactNode;
  copy: OrderDetailsContentCopy;
  headingLevel?: "h1" | "h2";
  headingRef?: Ref<HTMLHeadingElement>;
  locale: Locale;
  order: OrderDetails;
};

export function OrderDetailsHeader({
  actions,
  copy,
  headingLevel = "h2",
  headingRef,
  locale,
  order,
}: OrderDetailsHeaderProps) {
  const customerStatus = normalizedStatus(order.customerStatus);
  const Heading = headingLevel;

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Heading
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="text-h2 font-bold text-gray-1000 outline-none"
        >
          {copy.orderLabel} <bdi dir="ltr">{order.displayNumber}</bdi>
        </Heading>
        <p className="mt-1 type-body-sm text-gray-500">
          <time dateTime={order.placedAt}>
            {copy.placedAt(formatOrderDate(locale, order.placedAt))}
          </time>
        </p>
      </div>
      <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
        <OrderStatusBadge
          status={customerStatus}
          label={statusLabel(customerStatus, copy.statusLabels)}
        />
        {actions}
      </div>
    </header>
  );
}

type OrderDetailsContentProps = {
  copy: OrderDetailsContentCopy;
  locale: Locale;
  order: OrderDetails;
  productReviewCopy?: OrderProductReviewCopy;
};

export function OrderDetailsContent({
  copy,
  locale,
  order,
  productReviewCopy,
}: OrderDetailsContentProps) {
  return (
    <>
      <OrderTimeline
        title={copy.timeline.title}
        events={order.timeline}
        locale={locale}
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
        reviewCopy={productReviewCopy}
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
    </>
  );
}
