import type {
  OrderReturnRequestDto,
  OrderReturnResponseDto,
} from "@/features/order-returns/api/order-return-dto";
import {
  orderReturnReasons,
  orderReturnStatuses,
  type OrderReturnReason,
  type OrderReturnStatus,
} from "@/features/order-returns/types/order-return.types";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class OrderReturnContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Order Return API payload at "${path}": expected ${expected}.`);
    this.name = "OrderReturnContractError";
  }
}

const { parseNonEmptyString, parseNullableString, parseRecord } =
  createRuntimeValidators(
    (path, expected) => new OrderReturnContractError(path, expected),
  );

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new OrderReturnContractError(path, "a positive safe integer");
  }
  return value;
}

function requiredNullablePositiveInteger(
  value: unknown,
  path: string,
): number | null {
  return value === null ? null : positiveInteger(value, path);
}

function timestamp(value: unknown, path: string): string {
  const timestampValue = parseNonEmptyString(value, path).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
    timestampValue,
  );

  if (!match || !Number.isFinite(Date.parse(timestampValue))) {
    throw new OrderReturnContractError(path, "a valid timestamp string");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new OrderReturnContractError(path, "a valid timestamp string");
  }

  return timestampValue;
}

function requiredNullableTimestamp(
  value: unknown,
  path: string,
): string | null {
  return value === null ? null : timestamp(value, path);
}

export function isOrderReturnReason(value: unknown): value is OrderReturnReason {
  return (
    typeof value === "string" &&
    (orderReturnReasons as readonly string[]).includes(value)
  );
}

export function isOrderReturnStatus(value: unknown): value is OrderReturnStatus {
  return (
    typeof value === "string" &&
    (orderReturnStatuses as readonly string[]).includes(value)
  );
}

function reason(value: unknown, path: string): OrderReturnReason {
  if (!isOrderReturnReason(value)) {
    throw new OrderReturnContractError(path, "a documented Return reason");
  }
  return value;
}

function status(value: unknown, path: string): OrderReturnStatus {
  if (!isOrderReturnStatus(value)) {
    throw new OrderReturnContractError(path, "a documented Return status");
  }
  return value;
}

function parseRequest(value: unknown, path: string): OrderReturnRequestDto {
  const source = parseRecord(value, path);

  return {
    id: positiveInteger(source.id, `${path}.id`),
    order_id: positiveInteger(source.order_id, `${path}.order_id`),
    order_number: parseNonEmptyString(
      source.order_number,
      `${path}.order_number`,
    ).trim(),
    status: status(source.status, `${path}.status`),
    reason: reason(source.reason, `${path}.reason`),
    comment: parseNullableString(source.comment, `${path}.comment`),
    decision_note: parseNullableString(
      source.decision_note,
      `${path}.decision_note`,
    ),
    decided_by_admin_id: requiredNullablePositiveInteger(
      source.decided_by_admin_id,
      `${path}.decided_by_admin_id`,
    ),
    decided_at: requiredNullableTimestamp(
      source.decided_at,
      `${path}.decided_at`,
    ),
    created_at: timestamp(source.created_at, `${path}.created_at`),
    updated_at: timestamp(source.updated_at, `${path}.updated_at`),
  };
}

export function parseOrderReturnResponse(
  value: unknown,
): OrderReturnResponseDto {
  const source = parseRecord(value, "response");
  if (source.success !== true) {
    throw new OrderReturnContractError("response.success", "true");
  }

  return {
    success: true,
    data: parseRequest(source.data, "response.data"),
  };
}
