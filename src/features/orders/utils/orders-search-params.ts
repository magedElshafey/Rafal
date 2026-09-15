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
