import type {
  CheckoutQuoteCouponDto,
  CheckoutQuoteLocationDto,
  CheckoutQuoteResponseDto,
  CheckoutQuoteShippingOptionDto,
  CheckoutQuoteTotalsDto,
  CheckoutQuoteTotalsLineDto,
  CheckoutQuoteWarehouseDto,
  CheckoutUnavailableLineDto,
} from "@/features/checkout/api/checkout-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class CheckoutContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Checkout API payload at "${path}": expected ${expected}.`);
    this.name = "CheckoutContractError";
  }
}

const { parseArray, parseBoolean, parseRecord, parseString } =
  createRuntimeValidators(
    (path, expected) => new CheckoutContractError(path, expected),
  );

function positiveInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new CheckoutContractError(path, "a positive integer");
  }

  return value as number;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new CheckoutContractError(path, "a non-negative integer");
  }

  return value as number;
}

function decimalString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new CheckoutContractError(path, "a non-negative decimal string");
  }

  const normalized = value.trim();

  if (
    normalized === "" ||
    !/^\d+(?:\.\d+)?$/.test(normalized) ||
    !Number.isFinite(Number(normalized))
  ) {
    throw new CheckoutContractError(path, "a non-negative decimal string");
  }

  return normalized;
}

function parseResponseEnvelope(value: unknown) {
  const source = parseRecord(value, "response");

  return {
    source,
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
  };
}

function parseQuoteShippingOption(
  value: unknown,
  path: string,
): CheckoutQuoteShippingOptionDto {
  const source = parseRecord(value, path);

  return {
    id: positiveInteger(source.id, `${path}.id`),
    code: parseString(source.code, `${path}.code`),
    name: parseString(source.name, `${path}.name`),
    eta_label: parseString(source.eta_label, `${path}.eta_label`),
    price: decimalString(source.price, `${path}.price`),
    fee: decimalString(source.fee, `${path}.fee`),
    is_free: parseBoolean(source.is_free, `${path}.is_free`),
    is_pickup: parseBoolean(source.is_pickup, `${path}.is_pickup`),
  };
}

function parseQuoteWarehouse(
  value: unknown,
  path: string,
): CheckoutQuoteWarehouseDto {
  const source = parseRecord(value, path);

  return {
    id: positiveInteger(source.id, `${path}.id`),
    name: parseString(source.name, `${path}.name`),
  };
}

function parseQuoteLocation(
  value: unknown,
  path: string,
): CheckoutQuoteLocationDto {
  const source = parseRecord(value, path);
  const city = parseRecord(source.city, `${path}.city`);

  return {
    in_coverage: parseBoolean(source.in_coverage, `${path}.in_coverage`),
    city: {
      id: positiveInteger(city.id, `${path}.city.id`),
      name: parseString(city.name, `${path}.city.name`),
    },
  };
}

function parseTotalsLine(
  value: unknown,
  path: string,
): CheckoutQuoteTotalsLineDto {
  const source = parseRecord(value, path);

  return {
    unit_regular_price: decimalString(
      source.unit_regular_price,
      `${path}.unit_regular_price`,
    ),
    unit_price: decimalString(source.unit_price, `${path}.unit_price`),
    discount_per_unit: decimalString(
      source.discount_per_unit,
      `${path}.discount_per_unit`,
    ),
    quantity: positiveInteger(source.quantity, `${path}.quantity`),
    line_subtotal: decimalString(
      source.line_subtotal,
      `${path}.line_subtotal`,
    ),
    personalization_fee: decimalString(
      source.personalization_fee,
      `${path}.personalization_fee`,
    ),
    line_total: decimalString(source.line_total, `${path}.line_total`),
    discount_active: parseBoolean(
      source.discount_active,
      `${path}.discount_active`,
    ),
  };
}

function parseTotals(value: unknown, path: string): CheckoutQuoteTotalsDto {
  const source = parseRecord(value, path);
  const freeShipping = parseRecord(
    source.free_shipping,
    `${path}.free_shipping`,
  );
  const vat = parseRecord(source.vat, `${path}.vat`);

  return {
    lines: parseArray(source.lines, `${path}.lines`).map((line, index) =>
      parseTotalsLine(line, `${path}.lines[${index}]`),
    ),
    items_count: nonNegativeInteger(
      source.items_count,
      `${path}.items_count`,
    ),
    lines_count: nonNegativeInteger(
      source.lines_count,
      `${path}.lines_count`,
    ),
    subtotal: decimalString(source.subtotal, `${path}.subtotal`),
    product_discount_total: decimalString(
      source.product_discount_total,
      `${path}.product_discount_total`,
    ),
    personalization_total: decimalString(
      source.personalization_total,
      `${path}.personalization_total`,
    ),
    coupon_discount: decimalString(
      source.coupon_discount,
      `${path}.coupon_discount`,
    ),
    gift_wrap_fee: decimalString(
      source.gift_wrap_fee,
      `${path}.gift_wrap_fee`,
    ),
    shipping_fee:
      source.shipping_fee === null
        ? null
        : decimalString(source.shipping_fee, `${path}.shipping_fee`),
    free_shipping: {
      enabled: parseBoolean(
        freeShipping.enabled,
        `${path}.free_shipping.enabled`,
      ),
      threshold:
        freeShipping.threshold === null
          ? null
          : decimalString(
              freeShipping.threshold,
              `${path}.free_shipping.threshold`,
            ),
      qualifies: parseBoolean(
        freeShipping.qualifies,
        `${path}.free_shipping.qualifies`,
      ),
      remaining:
        freeShipping.remaining === null
          ? null
          : decimalString(
              freeShipping.remaining,
              `${path}.free_shipping.remaining`,
            ),
    },
    total: decimalString(source.total, `${path}.total`),
    vat: {
      rate: decimalString(vat.rate, `${path}.vat.rate`),
      amount: decimalString(vat.amount, `${path}.vat.amount`),
    },
    currency: parseString(source.currency, `${path}.currency`),
  };
}

function parseCoupon(
  value: unknown,
  path: string,
): CheckoutQuoteCouponDto {
  const source = parseRecord(value, path);

  return {
    code: parseString(source.code, `${path}.code`),
    valid: parseBoolean(source.valid, `${path}.valid`),
    reason:
      source.reason === null
        ? null
        : parseString(source.reason, `${path}.reason`),
  };
}

function parseUnavailableLine(
  value: unknown,
  path: string,
): CheckoutUnavailableLineDto {
  const source = parseRecord(value, path);
  const productName = parseRecord(source.product_name, `${path}.product_name`);

  return {
    cart_item_id: positiveInteger(source.cart_item_id, `${path}.cart_item_id`),
    product_name: {
      ar: parseString(productName.ar, `${path}.product_name.ar`),
      en: parseString(productName.en, `${path}.product_name.en`),
    },
    requested: positiveInteger(source.requested, `${path}.requested`),
    available: nonNegativeInteger(source.available, `${path}.available`),
    variant_total_requested: positiveInteger(
      source.variant_total_requested,
      `${path}.variant_total_requested`,
    ),
  };
}

export function parseCheckoutQuoteResponse(
  value: unknown,
): CheckoutQuoteResponseDto {
  const { source, success, message } = parseResponseEnvelope(value);
  const data = parseRecord(source.data, "response.data");

  return {
    success,
    message,
    data: {
      totals: parseTotals(data.totals, "response.data.totals"),
      shipping_options: parseArray(
        data.shipping_options,
        "response.data.shipping_options",
      ).map((option, index) =>
        parseQuoteShippingOption(
          option,
          `response.data.shipping_options[${index}]`,
        ),
      ),
      fulfillable: parseBoolean(
        data.fulfillable,
        "response.data.fulfillable",
      ),
      warehouse:
        data.warehouse === null
          ? null
          : parseQuoteWarehouse(data.warehouse, "response.data.warehouse"),
      unavailable_lines: parseArray(
        data.unavailable_lines,
        "response.data.unavailable_lines",
      ).map((line, index) =>
        parseUnavailableLine(
          line,
          `response.data.unavailable_lines[${index}]`,
        ),
      ),
      coupon:
        data.coupon === null
          ? null
          : parseCoupon(data.coupon, "response.data.coupon"),
      location: parseQuoteLocation(data.location, "response.data.location"),
    },
  };
}
