import type { Locale } from "next-intl";

import type {
  LoyaltyTransaction,
  LoyaltyTransactionType,
} from "@/features/loyalty/types/loyalty.types";
import { cn } from "@/lib/utils";

const STORE_TIME_ZONE = "Asia/Riyadh";

export type LoyaltyHistoryCopy = {
  title: string;
  empty: string;
  order: string;
  typeLabels: Record<LoyaltyTransactionType, string>;
  pointsLabels: Record<
    LoyaltyTransactionType,
    (formattedPoints: string) => string
  >;
};

type LoyaltyHistoryProps = {
  copy: LoyaltyHistoryCopy;
  locale: Locale;
  transactions: readonly LoyaltyTransaction[];
};

export function LoyaltyHistory({
  copy,
  locale,
  transactions,
}: LoyaltyHistoryProps) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: STORE_TIME_ZONE,
  });
  const pointsFormatter = new Intl.NumberFormat(locale);

  return (
    <section
      aria-labelledby="loyalty-history-title"
      className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8"
    >
      <h2
        id="loyalty-history-title"
        className="text-h3 font-bold text-gray-1000"
      >
        {copy.title}
      </h2>

      {transactions.length > 0 ? (
        <ol className="mt-4">
          {transactions.map((transaction, index) => (
            <li
              key={transaction.id}
              className={cn(
                "flex min-h-20 items-center justify-between gap-4 py-4 sm:gap-6",
                index > 0 && "border-t border-gray-200",
              )}
            >
              <div className="min-w-0">
                <p className="type-body font-medium text-gray-1000">
                  {copy.typeLabels[transaction.type]}
                  <span aria-hidden="true"> — </span>
                  {copy.order} <bdi>#{transaction.orderReference}</bdi>
                </p>
                <p className="mt-1 type-caption text-gray-400">
                  <time dateTime={transaction.occurredAt}>
                    {dateFormatter.format(new Date(transaction.occurredAt))}
                  </time>
                </p>
              </div>
              <span
                className={cn(
                  "max-w-[45%] shrink-0 break-all text-end type-body font-bold sm:max-w-none",
                  transaction.type === "earned"
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {copy.pointsLabels[transaction.type](
                  pointsFormatter.format(transaction.points),
                )}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 type-body text-gray-500">{copy.empty}</p>
      )}
    </section>
  );
}
