import type { Locale } from "next-intl";

import { ChevronLeftIcon } from "@/components/ui/icons";
import { CancelOrderAction } from "@/features/orders/components/cancel-order-action";
import {
  OrderDetailsContent,
  OrderDetailsHeader,
  type OrderDetailsContentCopy,
} from "@/features/orders/components/order-details-content";
import type { OrderDetails } from "@/features/orders/types/order.types";
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
}>;

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
          order.capabilities.canCancel ? (
            <CancelOrderAction
              copy={copy.cancel}
              locale={locale}
              orderNumber={order.orderNumber}
            />
          ) : null
        }
      />

      <OrderDetailsContent copy={copy} locale={locale} order={order} />
    </div>
  );
}
