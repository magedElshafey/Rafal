import type { Locale } from "next-intl";

import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import type { OrderListItem as OrderListItemData } from "@/features/orders/types/order.types";
import {
  formatOrderDate,
  formatOrderMoney,
} from "@/features/orders/utils/order-formatters";

type OrderListItemProps = {
  itemCountLabel: string;
  locale: Locale;
  order: OrderListItemData;
};

export function OrderListItem({
  itemCountLabel,
  locale,
  order,
}: OrderListItemProps) {
  return (
    <li className="border-b border-gray-200 last:border-b-0">
      <article className="grid min-h-16 items-center gap-4 px-4 py-4 sm:grid-cols-[minmax(10rem,1.5fr)_minmax(8rem,1fr)_minmax(8rem,auto)] sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate type-body font-bold text-gray-1000">
            <bdi dir="ltr">{order.displayNumber}</bdi>
          </h2>
          <p className="mt-1 type-caption text-gray-400">
            <time dateTime={order.placedAt}>
              {formatOrderDate(locale, order.placedAt)}
            </time>
            <span aria-hidden="true"> · </span>
            {itemCountLabel}
          </p>
        </div>

        <OrderStatusBadge label={order.statusLabel} status={order.customerStatus} />

        <p className="type-body font-bold text-gray-1000 sm:text-center">
          <bdi>
            {formatOrderMoney(
              locale,
              order.total,
              order.currency,
            )}
          </bdi>
        </p>
      </article>
    </li>
  );
}
