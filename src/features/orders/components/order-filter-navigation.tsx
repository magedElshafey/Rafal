import { buttonVariants } from "@/components/ui/button";
import {
  orderFilterValues,
  type OrderFilter,
} from "@/features/orders/types/order.types";
import { buildOrdersListHref } from "@/features/orders/utils/orders-search-params";
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
          const href = buildOrdersListHref({ filter });

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
                  "border-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
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
