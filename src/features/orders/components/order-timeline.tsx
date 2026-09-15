import type { Locale } from "next-intl";

import type {
  OrderTimelineEvent,
  OrderTimelineStage,
} from "@/features/orders/types/order.types";
import { formatOrderDateTime } from "@/features/orders/utils/order-formatters";

type OrderTimelineProps = {
  completedLabel: string;
  events: OrderTimelineEvent[];
  locale: Locale;
  pendingLabel: string;
  stageLabels: Record<OrderTimelineStage, string>;
  title: string;
};

export function OrderTimeline({
  completedLabel,
  events,
  locale,
  pendingLabel,
  stageLabels,
  title,
}: OrderTimelineProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{title}</h2>
      <ol className="mt-6 grid gap-5 md:flex md:gap-0">
        {events.map((event, index) => {
          const completed = Boolean(event.completedAt);

          return (
            <li key={event.stage} className="group min-w-0 md:flex-1">
              <div className="flex items-center" aria-hidden="true">
                <span
                  className={`size-3 shrink-0 rounded-full ${
                    completed ? "bg-success" : "bg-gray-300"
                  }`}
                />
                {index < events.length - 1 ? (
                  <span
                    className={`hidden h-0.5 flex-1 md:block ${
                      completed ? "bg-success" : "bg-gray-300"
                    }`}
                  />
                ) : null}
              </div>
              <div className="mt-2 pe-3">
                <p className="type-body font-bold text-gray-1000">
                  {stageLabels[event.stage]}
                </p>
                {event.completedAt ? (
                  <time
                    dateTime={event.completedAt}
                    className="mt-1 block type-caption text-gray-400"
                  >
                    <span className="sr-only">{completedLabel}: </span>
                    {formatOrderDateTime(locale, event.completedAt)}
                  </time>
                ) : (
                  <p className="mt-1 type-caption text-gray-400">
                    {pendingLabel}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
