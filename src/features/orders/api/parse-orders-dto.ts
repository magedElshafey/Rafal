import type {
  OrderListItemDto,
  OrdersPageResponseDto,
} from "@/features/orders/api/orders-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class OrdersContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Orders API payload at "${path}": expected ${expected}.`);
    this.name = "OrdersContractError";
  }
}

const {
  parseArray,
  parseNonEmptyString,
  parseNullableString,
  parseRecord,
  parseString,
} = createRuntimeValidators(
  (path, expected) => new OrdersContractError(path, expected),
);

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new OrdersContractError(path, "a positive safe integer");
  }
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new OrdersContractError(path, "a non-negative safe integer");
  }
  return value;
}

function moneyString(value: unknown, path: string): string {
  const amount = parseNonEmptyString(value, path).trim();
  if (!/^\d+(?:\.\d+)?$/.test(amount) || !Number.isFinite(Number(amount))) {
    throw new OrdersContractError(path, "a non-negative decimal money string");
  }
  return amount;
}

function timestamp(value: unknown, path: string): string {
  const placedAt = parseNonEmptyString(value, path).trim();
  if (!Number.isFinite(Date.parse(placedAt))) {
    throw new OrdersContractError(path, "a valid timestamp string");
  }
  return placedAt;
}

function parseOrder(value: unknown, path: string): OrderListItemDto {
  const source = parseRecord(value, path);
  const firstItem = parseRecord(source.first_item, `${path}.first_item`);

  return {
    order_number: parseNonEmptyString(
      source.order_number,
      `${path}.order_number`,
    ).trim(),
    display_number: parseNonEmptyString(
      source.display_number,
      `${path}.display_number`,
    ).trim(),
    placed_at: timestamp(source.placed_at, `${path}.placed_at`),
    customer_status: parseNonEmptyString(
      source.customer_status,
      `${path}.customer_status`,
    ).trim(),
    status_label: parseNonEmptyString(
      source.status_label,
      `${path}.status_label`,
    ).trim(),
    total: moneyString(source.total, `${path}.total`),
    currency: parseNonEmptyString(source.currency, `${path}.currency`).trim(),
    items_count: nonNegativeInteger(source.items_count, `${path}.items_count`),
    first_item: {
      name: parseString(firstItem.name, `${path}.first_item.name`),
      image_url: parseNullableString(
        firstItem.image_url,
        `${path}.first_item.image_url`,
      ),
    },
  };
}

export function parseOrdersPageResponse(
  value: unknown,
): OrdersPageResponseDto {
  const source = parseRecord(value, "response");
  if (source.success !== true) {
    throw new OrdersContractError("response.success", "true");
  }
  const meta = parseRecord(source.meta, "response.meta");

  return {
    success: true,
    data: parseArray(source.data, "response.data").map((order, index) =>
      parseOrder(order, `response.data[${index}]`),
    ),
    meta: {
      current_page: positiveInteger(
        meta.current_page,
        "response.meta.current_page",
      ),
      last_page: positiveInteger(meta.last_page, "response.meta.last_page"),
      per_page: positiveInteger(meta.per_page, "response.meta.per_page"),
      total: nonNegativeInteger(meta.total, "response.meta.total"),
    },
  };
}
