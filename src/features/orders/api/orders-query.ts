import type { OrderCustomerStatus } from "@/features/orders/utils/order-filters";

export function buildOrdersListQuery(
  page: number,
  customerStatuses?: readonly OrderCustomerStatus[],
) {
  return {
    page,
    ...(customerStatuses?.length
      ? { "status[]": [...customerStatuses] }
      : {}),
  };
}
