import type { Locale } from "next-intl";

import { ChevronRightIcon } from "@/components/ui/icons";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import type { OrderListItem as OrderListItemData } from "@/features/orders/types/order.types";
import {
  formatOrderDate,
  formatOrderMoney,
} from "@/features/orders/utils/order-formatters";
import { Link } from "@/i18n/navigation";

type OrderListItemProps = {
  detailsLabel: string;
  itemCountLabel: string;
  locale: Locale;
  order: OrderListItemData;
};

export function OrderListItem({
  detailsLabel,
  itemCountLabel,
  locale,
  order,
}: OrderListItemProps) {
  return (
    <li className="border-b border-gray-200 last:border-b-0">
      <Link
        href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
        aria-label={detailsLabel}
        className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold-500 sm:grid-cols-[minmax(10rem,1.5fr)_minmax(8rem,1fr)_minmax(8rem,auto)_auto] sm:px-6"
      >
        <div className="min-w-0 sm:col-start-1 sm:row-start-1">
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

        <div className="sm:col-start-2 sm:row-start-1">
          <OrderStatusBadge
            label={order.statusLabel}
            status={order.customerStatus}
          />
        </div>

        <p className="type-body font-bold text-gray-1000 sm:col-start-3 sm:row-start-1 sm:text-center">
          <bdi>{formatOrderMoney(locale, order.total, order.currency)}</bdi>
        </p>

        <ChevronRightIcon
          aria-hidden="true"
          className="col-start-2 row-span-3 row-start-1 size-5 shrink-0 self-center text-gray-700 rtl:rotate-180 sm:col-start-4 sm:row-span-1"
        />
      </Link>
    </li>
  );
}
