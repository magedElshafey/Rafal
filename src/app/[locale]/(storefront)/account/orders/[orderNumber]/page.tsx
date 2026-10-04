import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrderReturnHistory } from "@/features/order-returns/components/order-return-history";
import {
  OrderDetailsView,
  type OrderDetailsCopy,
} from "@/features/orders/components/order-details-view";
import { getCurrentUserOrderDetails } from "@/features/orders/server/orders-boundary";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type OrderDetailsPageProps = {
  params: Promise<{ orderNumber: string }>;
};

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  const [{ orderNumber }, locale] = await Promise.all([params, getLocale()]);
  const [result, t] = await Promise.all([
    getCurrentUserOrderDetails(locale, orderNumber),
    getTranslations("Account.orders.details"),
  ]);

  if (result.kind === "not-found") notFound();

  const copy: OrderDetailsCopy = {
    backToOrders: t("backToOrders"),
    cancel: {
      action: t("cancel.action"),
      cancel: t("cancel.keep"),
      confirm: t("cancel.confirm"),
      description: t("cancel.description"),
      error: t("cancel.error"),
      loading: t("cancel.cancelling"),
      success: t("cancel.success"),
      title: t("cancel.title"),
    },
    productReview: {
      action: t("review.action"),
      pendingReview: t("review.pendingReview"),
      title: t("review.title"),
      question: t("review.question"),
      ratingLabel: t.raw("review.ratingLabel") as string,
      ratingRequired: t("review.ratingRequired"),
      commentLabel: t("review.commentLabel"),
      commentPlaceholder: t("review.commentPlaceholder"),
      cancel: t("review.cancel"),
      submit: t("review.submit"),
      submitting: t("review.submitting"),
      close: t("review.close"),
      successTitle: t("review.successTitle"),
      successBody: t("review.successBody"),
      developmentDiagnostic: t("review.developmentDiagnostic"),
      errors: {
        auth: t("review.errors.auth"),
        validation: t("review.errors.validation"),
        notAllowed: t("review.errors.notAllowed"),
        rateLimited: t("review.errors.rateLimited"),
        service: t("review.errors.service"),
      },
    },
    returnRequest: {
      action: t("returnRequest.action"),
      title: t("returnRequest.title"),
      orderContextText: t("returnRequest.orderContext", {
        number: result.order.orderNumber,
      }),
      description: t("returnRequest.description"),
      reasonLabel: t("returnRequest.reasonLabel"),
      reasonPlaceholder: t("returnRequest.reasonPlaceholder"),
      reasonRequired: t("returnRequest.reasonRequired"),
      reasons: {
        damaged: t("returnRequest.reasons.damaged"),
        wrong_item: t("returnRequest.reasons.wrongItem"),
        not_as_described: t("returnRequest.reasons.notAsDescribed"),
        changed_mind: t("returnRequest.reasons.changedMind"),
        other: t("returnRequest.reasons.other"),
      },
      submit: t("returnRequest.submit"),
      submitting: t("returnRequest.submitting"),
      cancel: t("returnRequest.cancel"),
      close: t("returnRequest.close"),
      successTitle: t("returnRequest.successTitle"),
      successBody: t("returnRequest.successBody"),
      summaryTitle: t("returnRequest.summaryTitle"),
      requestDate: t("returnRequest.requestDate"),
      decisionDate: t("returnRequest.decisionDate"),
      decisionNote: t("returnRequest.decisionNote"),
      statuses: {
        pending: t("returnRequest.statuses.pending"),
        approved: t("returnRequest.statuses.approved"),
        rejected: t("returnRequest.statuses.rejected"),
      },
      errors: {
        auth: t("returnRequest.errors.auth"),
        invalidReason: t("returnRequest.errors.invalidReason"),
        notAllowed: t("returnRequest.errors.notAllowed"),
        rateLimited: t("returnRequest.errors.rateLimited"),
        service: t("returnRequest.errors.service"),
      },
    },
    orderLabel: t("orderLabel"),
    placedAt: (date) => t("placedAt", { date }),
    statusLabels: {
      new: t("currentStatus.new"),
      confirmed: t("currentStatus.confirmed"),
      processing: t("currentStatus.processing"),
      shipped: t("currentStatus.shipped"),
      delivered: t("currentStatus.delivered"),
      cancelled: t("currentStatus.cancelled"),
      returned: t("currentStatus.returned"),
      payment_failed: t("currentStatus.paymentFailed"),
    },
    timeline: {
      title: t("timeline.title"),
      reached: t("timeline.reachedState"),
      pending: t("timeline.pendingState"),
      stageLabels: {
        confirmed: t("timeline.confirmed"),
        processing: t("timeline.processing"),
        shipped: t("timeline.shipped"),
        delivered: t("timeline.delivered"),
        cancelled: t("timeline.cancelled"),
        returned: t("timeline.returned"),
      },
    },
    products: {
      title: t("itemsTitle"),
      quantity: (count) => t("quantity", { count }),
      unitPrice: t("unitPrice"),
      attributeLabels: {
        size: t("attributes.size"),
        color: t("attributes.color"),
      },
    },
    shipping: {
      title: t("shippingAddress"),
      recipient: t("shippingRecipient"),
      address: t("shippingAddressLabel"),
      phone: t("shippingPhone"),
      method: t("shippingMethod"),
    },
    payment: {
      title: t("paymentTitle"),
      method: t("paymentMethod"),
      status: t("paymentStatus"),
      paidAt: t("paidAt"),
      total: t("total"),
      methodLabels: {
        card: t("paymentMethods.card"),
        mada: t("paymentMethods.mada"),
        "credit-card": t("paymentMethods.creditCard"),
      },
      statusLabels: {
        paid: t("paymentStatuses.paid"),
      },
    },
  };

  return (
    <OrderDetailsView
      order={result.order}
      locale={locale}
      copy={copy}
      returnHistory={
        <Suspense fallback={null}>
          <OrderReturnHistory
            copy={copy.returnRequest}
            locale={locale}
            order={result.order}
          />
        </Suspense>
      }
    />
  );
}
