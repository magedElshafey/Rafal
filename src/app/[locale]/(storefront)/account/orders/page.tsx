import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { OrderListItem } from "@/features/orders/components/order-list-item";
import { OrdersPagination } from "@/features/orders/components/orders-pagination";
import { getCurrentUserOrdersPage } from "@/features/orders/server/orders-boundary";
import type { OrdersPage as OrdersPageData } from "@/features/orders/types/order.types";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = rawPage === undefined ? 1 : Number(rawPage);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [ordersPage, t] = await Promise.all([
    getCurrentUserOrdersPage(locale, page).catch(
      (): OrdersPageData | null => null,
    ),
    getTranslations("Account.orders"),
  ]);

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
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
