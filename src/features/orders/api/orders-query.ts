import type { BackendOrderStatus } from "@/features/orders/utils/order-filters";

export function buildOrdersListQuery(
  page: number,
  statuses?: readonly BackendOrderStatus[],
) {
  return {
    page,
    ...(statuses?.length ? { status: [...statuses] } : {}),
  };
}
