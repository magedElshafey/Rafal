import type {
  OrderFilter,
  OrderStatus,
} from "@/features/orders/types/order.types";

export type OrderCustomerStatus = "processing" | "completed" | "cancelled";

const customerStatusesByFilter: Record<
  OrderFilter,
  readonly OrderCustomerStatus[]
> = {
  all: [],
  "in-progress": ["processing"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export function getOrderCustomerStatuses(
  filter: OrderFilter,
): readonly OrderCustomerStatus[] {
  return customerStatusesByFilter[filter];
}

const legacyDomainStatusesByFilter: Record<
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
  return (
    filter === "all" || legacyDomainStatusesByFilter[filter].includes(status)
  );
}
