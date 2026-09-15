import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getOrderById } from "@/features/orders/api/get-orders";
import { OrderAddress } from "@/features/orders/components/order-address";
import { OrderGiftRecipient } from "@/features/orders/components/order-gift-recipient";
import { OrderItems } from "@/features/orders/components/order-items";
import { OrderPaymentSummary } from "@/features/orders/components/order-payment-summary";
import { OrderShipmentTracking } from "@/features/orders/components/order-shipment-tracking";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import type {
  OrderPaymentMethod,
  OrderStatus,
  OrderTimelineStage,
} from "@/features/orders/types/order.types";

type OrderDetailsPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  const { orderId } = await params;
  const [order, locale, t] = await Promise.all([
    getOrderById(orderId),
    getLocale(),
    getTranslations("Account.orders"),
  ]);

  if (!order) notFound();

  const currentStatusLabels: Record<OrderStatus, string> = {
    new: t("details.currentStatus.new"),
    confirmed: t("details.currentStatus.confirmed"),
    processing: t("details.currentStatus.processing"),
    shipped: t("details.currentStatus.shipped"),
    delivered: t("details.currentStatus.delivered"),
    cancelled: t("details.currentStatus.cancelled"),
    returned: t("details.currentStatus.returned"),
  };
  const timelineLabels: Record<OrderTimelineStage, string> = {
    confirmed: t("details.timeline.confirmed"),
    processing: t("details.timeline.processing"),
    shipped: t("details.timeline.shipped"),
    delivered: t("details.timeline.delivered"),
    cancelled: t("details.timeline.cancelled"),
    returned: t("details.timeline.returned"),
  };
  const paymentMethodLabels: Record<OrderPaymentMethod, string> = {
    mada: t("details.paymentMethods.mada"),
    "credit-card": t("details.paymentMethods.creditCard"),
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 text-h2 font-bold text-gray-1000">
          {t("details.title", { number: order.id })}
        </h1>
        <OrderStatusBadge
          status={order.status}
          label={currentStatusLabels[order.status]}
        />
      </header>

      <OrderTimeline
        title={t("details.timeline.title")}
        events={order.timeline}
        locale={locale}
        stageLabels={timelineLabels}
        completedLabel={t("details.timeline.completedState")}
        pendingLabel={t("details.timeline.pendingState")}
      />

      {order.shipmentTrackingNumber ? (
        <OrderShipmentTracking
          label={t("details.shipmentTrackingNumber")}
          trackingNumber={order.shipmentTrackingNumber}
        />
      ) : null}

      <OrderItems
        title={t("details.itemsTitle")}
        items={order.items}
        locale={locale}
        currency={order.payment.currency}
        quantityLabel={(count) => t("details.quantity", { count })}
      />

      {order.gift ? (
        <OrderGiftRecipient
          gift={order.gift}
          locale={locale}
          labels={{
            title: t("details.gift.title"),
            address: t("details.gift.address"),
            phone: t("details.gift.phone"),
            message: t("details.gift.message"),
          }}
        />
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <OrderAddress
          title={t("details.shippingAddress")}
          address={order.shippingAddress}
          locale={locale}
        />
        <OrderPaymentSummary
          title={t("details.paymentTitle")}
          locale={locale}
          payment={order.payment}
          methodLabel={t("details.paymentMethod")}
          totalLabel={t("details.total")}
          methodLabels={paymentMethodLabels}
        />
      </div>
    </div>
  );
}
