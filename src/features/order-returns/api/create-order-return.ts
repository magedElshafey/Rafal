import type { Locale } from "next-intl";

import type {
  OrderReturnReason,
  OrderReturnRequest,
} from "@/features/order-returns/types/order-return.types";
import {
  orderReturnReasons,
} from "@/features/order-returns/types/order-return.types";
import { ApiError } from "@/lib/api/api-error";

type OrderReturnErrorBody = Readonly<{ code?: unknown }>;
type OrderReturnSuccessBody = Readonly<{ request?: unknown }>;

function isPositiveIntegerString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0;
}

function isOrderReturnRequest(
  value: unknown,
  expectedOrderNumber: string,
): value is OrderReturnRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Partial<OrderReturnRequest>;
  return (
    isPositiveIntegerString(request.id) &&
    isPositiveIntegerString(request.orderId) &&
    request.orderNumber === expectedOrderNumber &&
    request.status === "pending" &&
    request.reason !== undefined &&
    orderReturnReasons.includes(request.reason) &&
    (request.comment === null || typeof request.comment === "string") &&
    (request.decisionNote === null ||
      typeof request.decisionNote === "string") &&
    (request.decidedAt === null || typeof request.decidedAt === "string") &&
    typeof request.createdAt === "string" &&
    Number.isFinite(Date.parse(request.createdAt)) &&
    typeof request.updatedAt === "string" &&
    Number.isFinite(Date.parse(request.updatedAt))
  );
}

export async function createOrderReturnFromBrowser(
  locale: Locale,
  orderNumber: string,
  reason: OrderReturnReason,
): Promise<OrderReturnRequest> {
  const response = await fetch(
    `/api/orders/${encodeURIComponent(orderNumber)}/return-request?${new URLSearchParams({ locale })}`,
    {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );

  if (response.ok) {
    const body = (await response.json()) as OrderReturnSuccessBody;
    if (isOrderReturnRequest(body.request, orderNumber)) return body.request;

    throw new ApiError({
      status: 502,
      code: "service-unavailable",
      message: "Order Return response was invalid.",
    });
  }

  let body: OrderReturnErrorBody = {};
  try {
    body = (await response.json()) as OrderReturnErrorBody;
  } catch {
    // The localized UI owns the generic fallback.
  }

  throw new ApiError({
    status: response.status,
    code: typeof body.code === "string" ? body.code : undefined,
    message: "Order Return request failed.",
  });
}
