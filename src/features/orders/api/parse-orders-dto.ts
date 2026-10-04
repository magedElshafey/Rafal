import type {
  OrderDetailsDto,
  OrderDetailsResponseDto,
  OrderListItemDto,
  OrdersPageResponseDto,
} from "@/features/orders/api/orders-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";
import {
  parseVariantAttributes,
  VariantAttributesContractError,
} from "@/lib/variant-attributes";

export class OrdersContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Orders API payload at "${path}": expected ${expected}.`);
    this.name = "OrdersContractError";
  }
}

const {
  parseArray,
  parseBoolean,
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

function nullableTimestamp(value: unknown, path: string): string | null {
  return value === null || value === undefined ? null : timestamp(value, path);
}

function requiredNullableTimestamp(value: unknown, path: string): string | null {
  return value === null ? null : timestamp(value, path);
}

function optionalString(value: unknown, path: string): string | null {
  return value === null || value === undefined
    ? null
    : parseString(value, path);
}

function optionalMoneyString(value: unknown, path: string): string | null {
  return value === null || value === undefined
    ? null
    : moneyString(value, path);
}

function optionalBoolean(value: unknown, path: string): boolean | null {
  return value === null || value === undefined
    ? null
    : parseBoolean(value, path);
}

function capability(value: unknown, path: string): boolean {
  return value === null || value === undefined
    ? false
    : parseBoolean(value, path);
}

function optionalPositiveInteger(value: unknown, path: string): number | null {
  return value === null || value === undefined
    ? null
    : positiveInteger(value, path);
}

function parseCity(
  value: unknown,
  path: string,
): { id: number; name: string } {
  const city = parseRecord(value, path);
  return {
    id: positiveInteger(city.id, `${path}.id`),
    name: parseString(city.name, `${path}.name`),
  };
}

function historicalVariantAttributes(value: unknown, path: string) {
  try {
    return parseVariantAttributes(value, path);
  } catch (error) {
    if (!(error instanceof VariantAttributesContractError)) throw error;
    console.error(
      "[orders:variant-contract] omitted malformed historical attributes",
      { path, reason: error.message },
    );
    return parseVariantAttributes(undefined, path);
  }
}

function parseDetails(value: unknown, path: string): OrderDetailsDto {
  const source = parseRecord(value, path);
  const gift =
    source.gift === null || source.gift === undefined
      ? null
      : parseRecord(source.gift, `${path}.gift`);
  const recipient =
    gift === null || gift.recipient === null || gift.recipient === undefined
      ? null
      : parseRecord(gift.recipient, `${path}.gift.recipient`);
  const shippingAddress = parseRecord(
    source.shipping_address,
    `${path}.shipping_address`,
  );
  const shippingMethod =
    source.shipping_method === null || source.shipping_method === undefined
      ? null
      : parseRecord(source.shipping_method, `${path}.shipping_method`);
  const money = parseRecord(source.money, `${path}.money`);
  const vat =
    money.vat === null || money.vat === undefined
      ? null
      : parseRecord(money.vat, `${path}.money.vat`);
  const payment = parseRecord(source.payment, `${path}.payment`);

  return {
    id: positiveInteger(source.id, `${path}.id`),
    order_number: parseNonEmptyString(
      source.order_number,
      `${path}.order_number`,
    ).trim(),
    display_number: parseNonEmptyString(
      source.display_number,
      `${path}.display_number`,
    ).trim(),
    status: parseNonEmptyString(source.status, `${path}.status`).trim(),
    customer_status: parseNonEmptyString(
      source.customer_status,
      `${path}.customer_status`,
    ).trim(),
    requires_verification: optionalBoolean(
      source.requires_verification,
      `${path}.requires_verification`,
    ),
    placed_at: timestamp(source.placed_at, `${path}.placed_at`),
    items: parseArray(source.items, `${path}.items`).map((item, index) => {
      const itemPath = `${path}.items[${index}]`;
      const itemSource = parseRecord(item, itemPath);
      return {
        id: positiveInteger(itemSource.id, `${itemPath}.id`),
        product_name: parseNonEmptyString(
          itemSource.product_name,
          `${itemPath}.product_name`,
        ),
        variant_sku: optionalString(
          itemSource.variant_sku,
          `${itemPath}.variant_sku`,
        ),
        variant_attributes: historicalVariantAttributes(
          itemSource.variant_attributes,
          `${itemPath}.variant_attributes`,
        ),
        quantity: positiveInteger(itemSource.quantity, `${itemPath}.quantity`),
        unit_price: moneyString(itemSource.unit_price, `${itemPath}.unit_price`),
        discount_amount: optionalMoneyString(
          itemSource.discount_amount,
          `${itemPath}.discount_amount`,
        ),
        line_total: moneyString(itemSource.line_total, `${itemPath}.line_total`),
      };
    }),
    gift:
      gift === null
        ? null
        : {
            is_gift: parseBoolean(gift.is_gift, `${path}.gift.is_gift`),
            is_anonymous: optionalBoolean(
              gift.is_anonymous,
              `${path}.gift.is_anonymous`,
            ),
            gift_message: optionalString(
              gift.gift_message,
              `${path}.gift.gift_message`,
            ),
            recipient:
              recipient === null
                ? null
                : {
                    name: optionalString(
                      recipient.name,
                      `${path}.gift.recipient.name`,
                    ),
                    phone: optionalString(
                      recipient.phone,
                      `${path}.gift.recipient.phone`,
                    ),
                    city:
                      recipient.city === null || recipient.city === undefined
                        ? null
                        : parseCity(
                            recipient.city,
                            `${path}.gift.recipient.city`,
                          ),
                    district: optionalString(
                      recipient.district,
                      `${path}.gift.recipient.district`,
                    ),
                    street_details: optionalString(
                      recipient.street_details,
                      `${path}.gift.recipient.street_details`,
                    ),
                  },
          },
    shipping_address: {
      recipient_name: parseString(
        shippingAddress.recipient_name,
        `${path}.shipping_address.recipient_name`,
      ),
      recipient_phone: parseString(
        shippingAddress.recipient_phone,
        `${path}.shipping_address.recipient_phone`,
      ),
      city:
        shippingAddress.city === null
          ? null
          : parseCity(shippingAddress.city, `${path}.shipping_address.city`),
      district: parseString(
        shippingAddress.district,
        `${path}.shipping_address.district`,
      ),
      street_details: parseString(
        shippingAddress.street_details,
        `${path}.shipping_address.street_details`,
      ),
    },
    shipping_method:
      shippingMethod === null
        ? null
        : {
            id: optionalPositiveInteger(
              shippingMethod.id,
              `${path}.shipping_method.id`,
            ),
            code: optionalString(
              shippingMethod.code,
              `${path}.shipping_method.code`,
            ),
            name: optionalString(
              shippingMethod.name,
              `${path}.shipping_method.name`,
            ),
          },
    money: {
      subtotal: optionalMoneyString(money.subtotal, `${path}.money.subtotal`),
      discount_total: optionalMoneyString(
        money.discount_total,
        `${path}.money.discount_total`,
      ),
      shipping_fee: optionalMoneyString(
        money.shipping_fee,
        `${path}.money.shipping_fee`,
      ),
      personalization_total: optionalMoneyString(
        money.personalization_total,
        `${path}.money.personalization_total`,
      ),
      gift_wrap_fee: optionalMoneyString(
        money.gift_wrap_fee,
        `${path}.money.gift_wrap_fee`,
      ),
      taxable_amount: optionalMoneyString(
        money.taxable_amount,
        `${path}.money.taxable_amount`,
      ),
      vat:
        vat === null
          ? null
          : {
              rate: optionalMoneyString(vat.rate, `${path}.money.vat.rate`),
              amount: optionalMoneyString(
                vat.amount,
                `${path}.money.vat.amount`,
              ),
            },
      total: moneyString(money.total, `${path}.money.total`),
      currency: parseNonEmptyString(
        money.currency,
        `${path}.money.currency`,
      ).trim(),
    },
    payment: {
      method:
        payment.method === null || payment.method === undefined
          ? null
          : parseNonEmptyString(
              payment.method,
              `${path}.payment.method`,
            ).trim(),
      status: parseNonEmptyString(
        payment.status,
        `${path}.payment.status`,
      ).trim(),
      paid_at: nullableTimestamp(payment.paid_at, `${path}.payment.paid_at`),
    },
    verification_expires_at: nullableTimestamp(
      source.verification_expires_at,
      `${path}.verification_expires_at`,
    ),
    timeline: parseArray(source.timeline, `${path}.timeline`).map(
      (timelineItem, index) => {
        const timelinePath = `${path}.timeline[${index}]`;
        const timelineSource = parseRecord(timelineItem, timelinePath);
        return {
          step: parseNonEmptyString(
            timelineSource.step,
            `${timelinePath}.step`,
          ).trim(),
          reached: parseBoolean(
            timelineSource.reached,
            `${timelinePath}.reached`,
          ),
          reached_at: requiredNullableTimestamp(
            timelineSource.reached_at,
            `${timelinePath}.reached_at`,
          ),
        };
      },
    ),
    can_cancel: capability(source.can_cancel, `${path}.can_cancel`),
    can_reorder: capability(source.can_reorder, `${path}.can_reorder`),
    can_request_return: capability(
      source.can_request_return,
      `${path}.can_request_return`,
    ),
  };
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

export function parseOrderDetailsResponse(
  value: unknown,
): OrderDetailsResponseDto {
  const source = parseRecord(value, "response");
  if (source.success !== true) {
    throw new OrdersContractError("response.success", "true");
  }
  return {
    success: true,
    data: parseDetails(source.data, "response.data"),
  };
}
