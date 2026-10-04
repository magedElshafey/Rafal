import "server-only";

import type { Locale } from "next-intl";

import { OrderReturnSummaryCard } from "@/features/order-returns/components/order-return-summary-card";
import { resolveOrderReturnModuleState } from "@/features/order-returns/server/order-returns-boundary";
import type { OrderReturnCopy } from "@/features/order-returns/types/order-return.types";
import type { OrderDetails } from "@/features/orders/types/order.types";

export async function OrderReturnHistory({
  copy,
  locale,
  order,
}: {
  copy: OrderReturnCopy;
  locale: Locale;
  order: OrderDetails;
}) {
  const state = await resolveOrderReturnModuleState(locale, order);
  if (state.kind !== "existing") return null;

  return (
    <OrderReturnSummaryCard
      copy={copy}
      locale={locale}
      request={state.request}
    />
  );
}
