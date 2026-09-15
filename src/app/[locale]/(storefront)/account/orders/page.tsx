import { getLocale, getTranslations } from "next-intl/server";

import { ErrorState } from "@/components/ui/error-state";
import { getOrders } from "@/features/orders/api/get-orders";
import { OrderFilterNavigation } from "@/features/orders/components/order-filter-navigation";
import { OrderListItem } from "@/features/orders/components/order-list-item";
import type {
  OrderFilter,
  OrderStatus,
} from "@/features/orders/types/order.types";
import { parseOrderFilter } from "@/features/orders/utils/orders-search-params";

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const activeFilter = parseOrderFilter(params.status);
  const [orders, locale, t] = await Promise.all([
    getOrders({ filter: activeFilter }),
    getLocale(),
    getTranslations("Account.orders"),
  ]);
  const filterLabels: Record<OrderFilter, string> = {
    all: t("filters.all"),
    "in-progress": t("filters.inProgress"),
    completed: t("filters.completed"),
    cancelled: t("filters.cancelled"),
  };
  const statusLabels: Record<OrderStatus, string> = {
    new: t("status.new"),
    confirmed: t("status.confirmed"),
    processing: t("status.processing"),
    shipped: t("status.shipped"),
    delivered: t("status.delivered"),
    cancelled: t("status.cancelled"),
    returned: t("status.returned"),
  };

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
      <div className="mt-4">
        <OrderFilterNavigation
          activeFilter={activeFilter}
          label={t("filters.label")}
          labels={filterLabels}
        />
      </div>

      <div className="mt-5">
        {orders.length === 0 ? (
          <ErrorState
            title={t("empty.title")}
            description={t("empty.description")}
          />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-gray-200 bg-gray-0">
            {orders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                locale={locale}
                statusLabels={statusLabels}
                itemCountLabel={t("itemCount", {
                  count: order.items.reduce(
                    (total, item) => total + item.quantity,
                    0,
                  ),
                })}
                detailsLabel={t("detailsLink", { number: order.id })}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
