import type { ComponentProps } from "react";

import { ChevronRightIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type BreadcrumbHref = ComponentProps<typeof Link>["href"];

type BreadcrumbItem = {
  label: string;
  href?: BreadcrumbHref;
};

type BreadcrumbsProps = {
  className?: string;
  items: readonly [BreadcrumbItem, ...BreadcrumbItem[]];
  label: string;
};

function Breadcrumbs({ className, items, label }: BreadcrumbsProps) {
  const currentIndex = items.length - 1;

  return (
    <nav
      aria-label={label}
      className={cn("min-w-0 type-body-sm text-gray-400", className)}
    >
      <ol className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isCurrentPage = index === currentIndex;

          return (
            <li
              key={`${item.label}-${index}`}
              aria-current={isCurrentPage ? "page" : undefined}
              className="flex min-w-0 max-w-full items-center gap-2"
            >
              {index > 0 ? (
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-3 shrink-0 rtl:rotate-180"
                />
              ) : null}

              {item.href && !isCurrentPage ? (
                <Link
                  href={item.href}
                  className="min-w-0 rounded-sm break-words [overflow-wrap:anywhere] hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "min-w-0 break-words [overflow-wrap:anywhere]",
                    isCurrentPage && "text-gray-700",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumbs };
export type { BreadcrumbHref, BreadcrumbItem, BreadcrumbsProps };
