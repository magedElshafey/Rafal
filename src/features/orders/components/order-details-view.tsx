import type { Locale } from "next-intl";
import type { ReactNode } from "react";

import { ChevronLeftIcon } from "@/components/ui/icons";
import { OrderReturnAction } from "@/features/order-returns/components/order-return-action";
import type { OrderReturnCopy } from "@/features/order-returns/types/order-return.types";
import {
  canCreateOrderReturn,
  isCompletedCustomerOrder,
} from "@/features/order-returns/utils/order-return-eligibility";
import { CancelOrderAction } from "@/features/orders/components/cancel-order-action";
import {
  OrderDetailsContent,
  OrderDetailsHeader,
  type OrderDetailsContentCopy,
} from "@/features/orders/components/order-details-content";
import type { OrderDetails } from "@/features/orders/types/order.types";
import type { OrderProductReviewCopy } from "@/features/reviews/components/order-product-review-action";
import { Link } from "@/i18n/navigation";

export type OrderDetailsCopy = OrderDetailsContentCopy & Readonly<{
  backToOrders: string;
  cancel: Readonly<{
    action: string;
    cancel: string;
    confirm: string;
    description: string;
    error: string;
    loading: string;
    success: string;
    title: string;
  }>;
  productReview: OrderProductReviewCopy;
  returnRequest: OrderReturnCopy;
}>;

type OrderDetailsViewProps = {
  copy: OrderDetailsCopy;
  locale: Locale;
  order: OrderDetails;
  returnHistory?: ReactNode;
};

export function OrderDetailsView({
  copy,
  locale,
  order,
  returnHistory,
}: OrderDetailsViewProps) {
  const showReturnAction = canCreateOrderReturn(order);
  const showReturnHistory =
    isCompletedCustomerOrder(order) && !showReturnAction;
  const showActions = order.capabilities.canCancel || showReturnAction;

  return (
    <div className="space-y-5">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1 type-body-sm font-medium text-gray-600 hover:text-gray-1000 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
        {copy.backToOrders}
      </Link>

      <OrderDetailsHeader
        copy={copy}
        headingLevel="h1"
        locale={locale}
        order={order}
        actions={
          showActions ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              {showReturnAction ? (
                <OrderReturnAction
                  copy={copy.returnRequest}
                  locale={locale}
                  orderNumber={order.orderNumber}
                />
              ) : null}
              {order.capabilities.canCancel ? (
                <CancelOrderAction
                  copy={copy.cancel}
                  locale={locale}
                  orderNumber={order.orderNumber}
                />
              ) : null}
            </div>
          ) : null
        }
      />

      {showReturnHistory ? returnHistory : null}

      <OrderDetailsContent
        copy={copy}
        locale={locale}
        order={order}
        productReviewCopy={
          order.status.trim().toLowerCase() === "delivered"
            ? copy.productReview
            : undefined
        }
      />
    </div>
  );
}
