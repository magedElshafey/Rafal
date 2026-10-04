import type { OrderDetails } from "@/features/orders/types/order.types";

type OrderTimelineProps = {
  events: OrderDetails["timeline"];
  pendingLabel: string;
  reachedLabel: string;
  stageLabels: Readonly<Record<string, string>>;
  title: string;
};

function formatStep(step: string, stageLabels: Readonly<Record<string, string>>) {
  const normalizedStep = step.trim().toLowerCase();
  return stageLabels[normalizedStep] ?? step.replace(/[_-]+/g, " ");
}

export function OrderTimeline({
  events,
  pendingLabel,
  reachedLabel,
  stageLabels,
  title,
}: OrderTimelineProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{title}</h2>
      <ol className="mt-6 grid gap-0 md:flex md:w-full">
        {events.map((event, index) => {
          const nextEvent = events[index + 1];
          const reachedConnector = event.reached && Boolean(nextEvent?.reached);

          return (
            <li
              key={`${event.step}-${index}`}
              className="relative grid min-w-0 grid-cols-[0.875rem_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0 md:block md:flex-1 md:pb-0"
            >
              <div className="relative flex justify-center md:h-3 md:items-center">
                {nextEvent ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={`absolute top-3 bottom-[-1.5rem] w-0.5 md:hidden ${
                        reachedConnector ? "bg-success" : "bg-gray-300"
                      }`}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute start-1/2 top-[0.3125rem] hidden h-0.5 w-full md:block ${
                        reachedConnector ? "bg-success" : "bg-gray-300"
                      }`}
                    />
                  </>
                ) : null}
                <span
                  aria-hidden="true"
                  className={`relative z-10 size-3 shrink-0 rounded-full ${
                    event.reached ? "bg-success" : "bg-gray-300"
                  }`}
                />
              </div>
              <div className="min-w-0 md:mt-3 md:px-2 md:text-center">
                <p className="type-body font-bold text-gray-1000">
                  {formatStep(event.step, stageLabels)}
                </p>
                <p
                  className={`mt-1 type-caption ${
                    event.reached ? "text-success" : "text-gray-500"
                  }`}
                >
                  {event.reached ? reachedLabel : pendingLabel}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
