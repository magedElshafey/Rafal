import "server-only";

import type { Locale } from "next-intl";

import {
  createOrderReturnDto,
  getOrderReturnDto,
} from "@/features/order-returns/api/order-returns-api.server";
import { mapOrderReturnResponse } from "@/features/order-returns/api/order-return-mapper";
import type {
  OrderReturnModuleState,
  OrderReturnReason,
  OrderReturnRequest,
} from "@/features/order-returns/types/order-return.types";
import {
  canCreateOrderReturn,
  hasInconsistentReturnCapability,
  isCompletedCustomerOrder,
} from "@/features/order-returns/utils/order-return-eligibility";
import {
  assertOrderReturnIdentity,
  OrderReturnIdentityMismatchError,
} from "@/features/order-returns/utils/order-return-identity";
import { getAccessToken } from "@/features/auth/server/auth-session";
import type { OrderDetails } from "@/features/orders/types/order.types";
import { ApiError } from "@/lib/api/api-error";

export class OrderReturnAuthenticationError extends Error {
  constructor() {
    super("An authenticated session is required for Order Returns.");
    this.name = "OrderReturnAuthenticationError";
  }
}

export class OrderReturnUnexpectedStatusError extends Error {
  constructor() {
    super("A new Return Request did not have pending status.");
    this.name = "OrderReturnUnexpectedStatusError";
  }
}

export { OrderReturnIdentityMismatchError };

function safeErrorCategory(error: unknown): string {
  if (error instanceof ApiError) return `http-${error.status}`;
  if (error instanceof OrderReturnIdentityMismatchError) return "identity";
  if (error instanceof OrderReturnAuthenticationError) return "auth";
  return "contract-or-service";
}

async function readCurrentUserOrderReturn(
  locale: Locale,
  orderNumber: string,
): Promise<OrderReturnRequest> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new OrderReturnAuthenticationError();

  const response = await getOrderReturnDto(locale, accessToken, orderNumber);
  assertOrderReturnIdentity(orderNumber, response.data.order_number);
  return mapOrderReturnResponse(response);
}

export async function resolveOrderReturnModuleState(
  locale: Locale,
  order: OrderDetails,
): Promise<OrderReturnModuleState> {
  if (hasInconsistentReturnCapability(order)) {
    console.error("[order-returns:eligibility] inconsistent capability", {
      orderNumber: order.orderNumber,
      customerStatus: order.customerStatus,
      canRequestReturn: order.capabilities.canRequestReturn,
    });
  }

  if (!isCompletedCustomerOrder(order)) return { kind: "unavailable" };
  if (canCreateOrderReturn(order)) return { kind: "create" };

  try {
    return {
      kind: "existing",
      request: await readCurrentUserOrderReturn(locale, order.orderNumber),
    };
  } catch (error) {
    console.error("[order-returns:read] unavailable", {
      orderNumber: order.orderNumber,
      category: safeErrorCategory(error),
    });
    return { kind: "unavailable" };
  }
}

export async function createCurrentUserOrderReturn(
  locale: Locale,
  orderNumber: string,
  reason: OrderReturnReason,
  signal?: AbortSignal,
): Promise<OrderReturnRequest> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new OrderReturnAuthenticationError();

  const response = await createOrderReturnDto(
    locale,
    accessToken,
    orderNumber,
    reason,
    signal,
  );
  assertOrderReturnIdentity(orderNumber, response.data.order_number);

  const request = mapOrderReturnResponse(response);
  if (request.status !== "pending") {
    console.error("[order-returns:create] unexpected status", {
      orderNumber,
      returnRequestId: request.id,
      status: request.status,
    });
    throw new OrderReturnUnexpectedStatusError();
  }

  return request;
}
