import type { OrderDetails } from "@/features/orders/types/order.types";

export function isCompletedCustomerOrder(order: OrderDetails): boolean {
  return (
    typeof order.customerStatus === "string" &&
    order.customerStatus.trim().toLowerCase() === "completed"
  );
}

export function canCreateOrderReturn(order: OrderDetails): boolean {
  return isCompletedCustomerOrder(order) && order.capabilities.canRequestReturn;
}

export function hasInconsistentReturnCapability(order: OrderDetails): boolean {
  return !isCompletedCustomerOrder(order) && order.capabilities.canRequestReturn;
}
