import { buttonVariants } from "@/components/ui/button";
import {
  orderFilterValues,
  type OrderFilter,
} from "@/features/orders/types/order.types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type OrderFilterNavigationProps = {
  activeFilter: OrderFilter;
  label: string;
  labels: Record<OrderFilter, string>;
};

export function OrderFilterNavigation({
  activeFilter,
  label,
  labels,
}: OrderFilterNavigationProps) {
  return (
    <nav aria-label={label}>
      <ul className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {orderFilterValues.map((filter) => {
          const active = activeFilter === filter;
          const href =
            filter === "all"
              ? "/account/orders"
              : `/account/orders?status=${filter}`;

          return (
            <li key={filter}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    size: "sm",
                    variant: active ? "secondary" : "outline",
                  }),
                  "border-gray-200",
                )}
              >
                {labels[filter]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
