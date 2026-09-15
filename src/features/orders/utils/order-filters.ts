import type {
  OrderFilter,
  OrderStatus,
} from "@/features/orders/types/order.types";

export const orderStatusesByFilter: Record<
  Exclude<OrderFilter, "all">,
  readonly OrderStatus[]
> = {
  "in-progress": ["new", "confirmed", "processing", "shipped"],
  completed: ["delivered"],
  cancelled: ["cancelled"],
};

export function matchesOrderFilter(
  status: OrderStatus,
  filter: OrderFilter,
): boolean {
  if (filter === "all") return true;

  return orderStatusesByFilter[filter].includes(status);
}
