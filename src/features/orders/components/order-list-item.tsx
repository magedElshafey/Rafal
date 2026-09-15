import type { Locale } from "next-intl";

import { ChevronRightIcon } from "@/components/ui/icons";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import type { Order, OrderStatus } from "@/features/orders/types/order.types";
import {
  formatOrderDate,
  formatOrderMoney,
} from "@/features/orders/utils/order-formatters";
import { Link } from "@/i18n/navigation";

type OrderListItemProps = {
  detailsLabel: string;
  itemCountLabel: string;
  locale: Locale;
  order: Order;
  statusLabels: Record<OrderStatus, string>;
};

export function OrderListItem({
  detailsLabel,
  itemCountLabel,
  locale,
  order,
  statusLabels,
}: OrderListItemProps) {
  return (
    <li className="border-b border-gray-200 last:border-b-0">
      <article className="grid min-h-16 items-center gap-3 px-4 py-4 sm:grid-cols-[minmax(9rem,1.3fr)_minmax(9rem,1fr)_auto_2.75rem] sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate type-body font-bold text-gray-1000">
            <bdi>#{order.id}</bdi>
          </h2>
          <p className="mt-1 type-caption text-gray-400">
            <time dateTime={order.placedAt}>
              {formatOrderDate(locale, order.placedAt)}
            </time>
            <span aria-hidden="true"> · </span>
            {itemCountLabel}
          </p>
        </div>

        <OrderStatusBadge
          label={statusLabels[order.status]}
          status={order.status}
        />

        <p className="type-body font-bold text-gray-1000 sm:text-center">
          <bdi>
            {formatOrderMoney(
              locale,
              order.payment.total,
              order.payment.currency,
            )}
          </bdi>
        </p>

        <Link
          href={`/account/orders/${order.id}`}
          aria-label={detailsLabel}
          className="inline-flex size-11 items-center justify-center justify-self-end rounded-md text-gray-1000 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRightIcon
            aria-hidden="true"
            className="size-5 rtl:rotate-180"
          />
        </Link>
      </article>
    </li>
  );
}
