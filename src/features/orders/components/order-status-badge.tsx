import type { OrderStatus } from "@/features/orders/types/order.types";
import { cn } from "@/lib/utils";

type OrderStatusBadgeProps = {
  label: string;
  status: OrderStatus;
};

const statusClasses: Record<OrderStatus, string> = {
  new: "bg-gold-50 text-gold-700",
  confirmed: "bg-gold-50 text-gold-700",
  processing: "bg-gold-50 text-gold-700",
  shipped: "bg-gold-50 text-gold-700",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  returned: "bg-gray-100 text-gray-700",
};

export function OrderStatusBadge({ label, status }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 w-fit items-center rounded-full px-3 type-body-sm font-medium",
        statusClasses[status],
      )}
    >
      {label}
    </span>
  );
}
