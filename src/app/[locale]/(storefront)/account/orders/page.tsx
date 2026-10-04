import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { OrderFilterNavigation } from "@/features/orders/components/order-filter-navigation";
import { OrderListItem } from "@/features/orders/components/order-list-item";
import { OrdersPagination } from "@/features/orders/components/orders-pagination";
import { getCurrentUserOrdersPage } from "@/features/orders/server/orders-boundary";
import type { OrdersPage as OrdersPageData } from "@/features/orders/types/order.types";
import { getBackendOrderStatuses } from "@/features/orders/utils/order-filters";
import {
  parseOrderFilter,
  parseOrdersPage,
} from "@/features/orders/utils/orders-search-params";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const filter = parseOrderFilter(params.filter);
  const page = parseOrdersPage(params.page);
  const statuses = getBackendOrderStatuses(filter);
  const [ordersPage, t] = await Promise.all([
    getCurrentUserOrdersPage(locale, page, statuses).catch(
      (): OrdersPageData | null => null,
    ),
    getTranslations("Account.orders"),
  ]);

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
      <div className="mt-5">
        <OrderFilterNavigation
          activeFilter={filter}
          label={t("filters.label")}
          labels={{
            all: t("filters.all"),
            "in-progress": t("filters.inProgress"),
            completed: t("filters.completed"),
            cancelled: t("filters.cancelled"),
          }}
        />
      </div>
      <div className="mt-6">
        {ordersPage === null ? (
          <ErrorState
            title={t("error.title")}
            description={t("error.description")}
          />
        ) : ordersPage.orders.length === 0 ? (
          <ErrorState
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <Link
                href="/products"
                className={buttonVariants({ size: "md", variant: "primary" })}
              >
                {t("empty.cta")}
              </Link>
            }
          />
        ) : (
          <>
            <ul className="overflow-hidden rounded-lg border border-gray-200 bg-gray-0">
              {ordersPage.orders.map((order) => (
                <OrderListItem
                  key={order.orderNumber}
                  order={order}
                  locale={locale}
                  detailsLabel={t("detailsLink", {
                    number: order.displayNumber,
                  })}
                  itemCountLabel={t("itemCount", {
                    count: order.itemsCount,
                  })}
                />
              ))}
            </ul>
            <OrdersPagination
              activeFilter={filter}
              currentPage={ordersPage.pagination.currentPage}
              lastPage={ordersPage.pagination.lastPage}
              nextLabel={t("pagination.next")}
              pageLabel={t("pagination.page", {
                current: ordersPage.pagination.currentPage,
                total: ordersPage.pagination.lastPage,
              })}
              previousLabel={t("pagination.previous")}
            />
          </>
        )}
      </div>
    </div>
  );
}
