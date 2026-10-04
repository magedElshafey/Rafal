import type {
  OrderFilter,
  OrderStatus,
} from "@/features/orders/types/order.types";

export type BackendOrderStatus =
  | "new"
  | "confirmed"
  | "proccessing"
  | "shipped"
  | "delivered"
  | "reterned"
  | "canceled"
  | "payment_failed";

const backendStatusesByFilter: Record<
  Exclude<OrderFilter, "all">,
  readonly BackendOrderStatus[]
> = {
  "in-progress": ["new", "confirmed", "proccessing", "shipped"],
  completed: ["delivered"],
  cancelled: ["canceled"],
};

export function getBackendOrderStatuses(
  filter: OrderFilter,
): readonly BackendOrderStatus[] | undefined {
  if (filter === "all") return undefined;

  return backendStatusesByFilter[filter];
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
