import { buttonVariants } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { OrderFilter } from "@/features/orders/types/order.types";
import { buildOrdersListHref } from "@/features/orders/utils/orders-search-params";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type OrdersPaginationProps = {
  activeFilter: OrderFilter;
  currentPage: number;
  lastPage: number;
  nextLabel: string;
  pageLabel: string;
  previousLabel: string;
};

export function OrdersPagination({
  activeFilter,
  currentPage,
  lastPage,
  nextLabel,
  pageLabel,
  previousLabel,
}: OrdersPaginationProps) {
  if (lastPage <= 1) return null;

  const linkClassName = cn(
    buttonVariants({ size: "md", variant: "outline" }),
    "min-w-11 gap-2",
  );

  return (
    <nav
      aria-label={pageLabel}
      className="mt-6 flex items-center justify-center gap-3"
    >
      {currentPage > 1 ? (
        <Link
          href={buildOrdersListHref({
            filter: activeFilter,
            page: currentPage - 1,
          })}
          className={linkClassName}
        >
          <ChevronLeftIcon
            aria-hidden="true"
            className="size-4 rtl:rotate-180"
          />
          <span className="hidden sm:inline">{previousLabel}</span>
        </Link>
      ) : null}
      <p className="min-w-24 text-center type-body text-gray-600">
        {pageLabel}
      </p>
      {currentPage < lastPage ? (
        <Link
          href={buildOrdersListHref({
            filter: activeFilter,
            page: currentPage + 1,
          })}
          className={linkClassName}
        >
          <span className="hidden sm:inline">{nextLabel}</span>
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 rtl:rotate-180"
          />
        </Link>
      ) : null}
    </nav>
  );
}
