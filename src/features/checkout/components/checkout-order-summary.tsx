import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CheckoutOrderSummaryItem = {
  id: string;
  image?: ReactNode;
  name: ReactNode;
  personalization?: ReactNode;
  variant?: ReactNode;
  quantity?: ReactNode;
  price: ReactNode;
};

type CheckoutOrderSummaryLine = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "discount";
};

type CheckoutOrderSummaryProps = {
  id: string;
  title: ReactNode;
  items: readonly CheckoutOrderSummaryItem[];
  lines: readonly CheckoutOrderSummaryLine[];
  totalLabel: ReactNode;
  totalValue: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function CheckoutOrderSummary({
  action,
  className,
  id,
  items,
  lines,
  title,
  totalLabel,
  totalValue,
}: CheckoutOrderSummaryProps) {
  const titleId = `${id}-title`;

  return (
    <aside
      aria-labelledby={titleId}
      className={cn("rounded-lg bg-gray-50 p-5 sm:p-6", className)}
    >
      <h2 id={titleId} className="text-h3 font-bold text-gray-1000">
        {title}
      </h2>

      <ul className="mt-5 divide-y divide-gray-200">
        {items.map((item) => (
          <li key={item.id} className="py-4 first:pt-0">
            <article className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3">
              <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100">
                {item.image}
              </div>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="type-body font-medium text-gray-1000">
                    {item.name}
                  </h3>
                  <span className="shrink-0 type-body font-medium text-gray-1000">
                    {item.price}
                  </span>
                </div>
                {item.variant ? (
                  <p className="mt-1 type-body-sm text-gray-500">
                    {item.variant}
                  </p>
                ) : null}
                {item.personalization ? (
                  <p className="mt-1 type-body-sm text-gold-700">
                    {item.personalization}
                  </p>
                ) : null}
                {item.quantity ? (
                  <p className="mt-1 type-caption text-gray-500">
                    {item.quantity}
                  </p>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>

      <dl className="border-t border-gray-200 pt-5">
        <div className="space-y-4 type-body text-gray-600">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex items-center justify-between gap-4"
            >
              <dt>{line.label}</dt>
              <dd
                className={cn(
                  "text-gray-1000",
                  line.tone === "discount" && "text-destructive",
                )}
              >
                {line.value}
              </dd>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-gray-200 pt-5">
          <dt className="type-body-lg font-medium text-gray-700">
            {totalLabel}
          </dt>
          <dd className="text-h3 font-bold text-gray-1000">{totalValue}</dd>
        </div>
      </dl>

      {action ? <div className="mt-5">{action}</div> : null}
    </aside>
  );
}

export type {
  CheckoutOrderSummaryItem,
  CheckoutOrderSummaryLine,
  CheckoutOrderSummaryProps,
};