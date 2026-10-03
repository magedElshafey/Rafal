import { cn } from "@/lib/utils";

type OrderStatusBadgeProps = {
  label: string;
  status: string;
};

function statusClassName(status: string): string {
  if (status === "delivered") return "bg-success/10 text-success";
  if (["canceled", "cancelled", "payment_failed"].includes(status)) {
    return "bg-destructive/10 text-destructive";
  }
  if (["returned", "reterned"].includes(status)) {
    return "bg-gray-100 text-gray-700";
  }
  if (
    ["new", "confirmed", "processing", "proccessing", "shipped"].includes(
      status,
    )
  ) {
    return "bg-gold-50 text-gold-700";
  }
  return "bg-gray-100 text-gray-700";
}

export function OrderStatusBadge({ label, status }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 w-fit items-center rounded-full px-3 type-body-sm font-medium",
        statusClassName(status),
      )}
    >
      {label}
    </span>
  );
}
