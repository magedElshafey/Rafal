import type { Locale } from "next-intl";

import type {
  OrderReturnCopy,
  OrderReturnRequest,
  OrderReturnStatus,
} from "@/features/order-returns/types/order-return.types";
import { getOrderReturnReasonLabel } from "@/features/order-returns/utils/order-return-contract";
import { formatOrderDate } from "@/features/orders/utils/order-formatters";
import { cn } from "@/lib/utils";

function statusClassName(status: OrderReturnStatus): string {
  if (status === "approved") return "bg-success/10 text-success";
  if (status === "rejected") return "bg-destructive/10 text-destructive";
  return "bg-gold-50 text-gold-700";
}

export function OrderReturnSummaryCard({
  copy,
  headingLevel = "h2",
  locale,
  request,
}: {
  copy: OrderReturnCopy;
  headingLevel?: "h2" | "h3";
  locale: Locale;
  request: OrderReturnRequest;
}) {
  const Heading = headingLevel;

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-0 p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Heading className="text-h4 font-bold text-gray-1000">
          {copy.summaryTitle}
        </Heading>
        <span
          className={cn(
            "inline-flex min-h-6 w-fit items-center rounded-full px-3 type-body-sm font-medium",
            statusClassName(request.status),
          )}
        >
          {copy.statuses[request.status]}
        </span>
      </header>

      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="type-label text-gray-500">{copy.reasonLabel}</dt>
          <dd className="mt-1 type-body font-medium text-gray-900">
            {getOrderReturnReasonLabel(request.reason, copy.reasons)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="type-label text-gray-500">{copy.requestDate}</dt>
          <dd className="mt-1 type-body font-medium text-gray-900">
            <time dateTime={request.createdAt}>
              {formatOrderDate(locale, request.createdAt)}
            </time>
          </dd>
        </div>
        {request.decisionNote !== null ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="type-label text-gray-500">{copy.decisionNote}</dt>
            <dd
              dir="auto"
              className="mt-1 whitespace-pre-wrap type-body leading-relaxed text-gray-900 [overflow-wrap:anywhere]"
            >
              {request.decisionNote}
            </dd>
          </div>
        ) : null}
        {request.decidedAt !== null ? (
          <div className="min-w-0">
            <dt className="type-label text-gray-500">{copy.decisionDate}</dt>
            <dd className="mt-1 type-body font-medium text-gray-900">
              <time dateTime={request.decidedAt}>
                {formatOrderDate(locale, request.decidedAt)}
              </time>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
