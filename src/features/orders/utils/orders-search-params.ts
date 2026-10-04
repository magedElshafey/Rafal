import {
  orderFilterValues,
  type OrderFilter,
} from "@/features/orders/types/order.types";

export function parseOrderFilter(
  value: string | string[] | undefined,
): OrderFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return orderFilterValues.find((filter) => filter === candidate) ?? "all";
}

export function parseOrdersPage(
  value: string | string[] | undefined,
): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !/^[1-9]\d*$/.test(candidate)) return 1;

  const page = Number(candidate);
  return Number.isSafeInteger(page) ? page : 1;
}

type BuildOrdersListHrefOptions = {
  filter: OrderFilter;
  page?: number;
};

export function buildOrdersListHref({
  filter,
  page = 1,
}: BuildOrdersListHrefOptions): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/account/orders?${query}` : "/account/orders";
}
