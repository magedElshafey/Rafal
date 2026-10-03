import { buttonVariants } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type OrdersPaginationProps = {
  currentPage: number;
  lastPage: number;
  nextLabel: string;
  pageLabel: string;
  previousLabel: string;
};

function pageHref(page: number): string {
  return page === 1 ? "/account/orders" : `/account/orders?page=${page}`;
}

export function OrdersPagination({
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
        <Link href={pageHref(currentPage - 1)} className={linkClassName}>
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
        <Link href={pageHref(currentPage + 1)} className={linkClassName}>
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
