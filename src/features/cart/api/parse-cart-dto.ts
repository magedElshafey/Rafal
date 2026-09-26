import type {
  CartAttributeDto,
  CartDataDto,
  CartLineDto,
  CartResponseDto,
  CartTotalsLineDto,
} from "@/features/cart/api/cart-dto";

export class CartContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Cart API payload at "${path}": expected ${expected}.`);
    this.name = "CartContractError";
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CartContractError(path, "an object");
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string") throw new CartContractError(path, "a string");
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : string(value, path);
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : string(value, path);
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new CartContractError(path, "a boolean");
  return value;
}

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new CartContractError(path, "a positive integer");
  }
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new CartContractError(path, "a non-negative integer");
  }
  return value;
}

function decimalString(value: unknown, path: string): string {
  const parsed = string(value, path);
  if (parsed.trim() === "" || !Number.isFinite(Number(parsed)) || Number(parsed) < 0) {
    throw new CartContractError(path, "a non-negative decimal string");
  }
  return parsed;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new CartContractError(path, "an array");
  return value;
}

function attributes(value: unknown, path: string): Readonly<Record<string, CartAttributeDto>> | null {
  if (value === null) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return {};
    throw new CartContractError(path, "an object, null, or an empty array");
  }
  const source = record(value, path);
  return Object.fromEntries(
    Object.entries(source).map(([key, item]) => {
      if (
        typeof item !== "string" &&
        typeof item !== "boolean" &&
        (typeof item !== "number" || !Number.isFinite(item))
      ) {
        throw new CartContractError(`${path}.${key}`, "a scalar attribute value");
      }
      return [key, item];
    }),
  );
}

function parseLine(value: unknown, path: string): CartLineDto {
  const source = record(value, path);
  const stock = record(source.stock, `${path}.stock`);
  const status = string(stock.status, `${path}.stock.status`);
  if (status !== "ok" && status !== "low" && status !== "out_of_stock") {
    throw new CartContractError(`${path}.stock.status`, "a supported stock status");
  }
  const product = record(source.product, `${path}.product`);
  const image = product.image === null ? null : record(product.image, `${path}.product.image`);
  const variant = record(source.variant, `${path}.variant`);

  return {
    id: positiveInteger(source.id, `${path}.id`),
    quantity: positiveInteger(source.quantity, `${path}.quantity`),
    personalization: source.personalization ?? null,
    stock: {
      status,
      available: nonNegativeInteger(stock.available, `${path}.stock.available`),
    },
    product: {
      id: positiveInteger(product.id, `${path}.product.id`),
      name: string(product.name, `${path}.product.name`),
      slug: string(product.slug, `${path}.product.slug`),
      image: image
        ? {
            id: positiveInteger(image.id, `${path}.product.image.id`),
            url: string(image.url, `${path}.product.image.url`),
          }
        : null,
      personalizable: boolean(product.personalizable, `${path}.product.personalizable`),
    },
    variant: {
      id: positiveInteger(variant.id, `${path}.variant.id`),
      sku: string(variant.sku, `${path}.variant.sku`),
      attributes: attributes(variant.attributes, `${path}.variant.attributes`),
    },
    unit_regular_price: decimalString(source.unit_regular_price, `${path}.unit_regular_price`),
    unit_price: decimalString(source.unit_price, `${path}.unit_price`),
    discount_active: boolean(source.discount_active, `${path}.discount_active`),
    personalization_fee: decimalString(source.personalization_fee, `${path}.personalization_fee`),
    line_total: decimalString(source.line_total, `${path}.line_total`),
  };
}

function parseTotalsLine(value: unknown, path: string): CartTotalsLineDto {
  const source = record(value, path);
  return {
    unit_regular_price: decimalString(source.unit_regular_price, `${path}.unit_regular_price`),
    unit_price: decimalString(source.unit_price, `${path}.unit_price`),
    discount_per_unit: decimalString(source.discount_per_unit, `${path}.discount_per_unit`),
    quantity: positiveInteger(source.quantity, `${path}.quantity`),
    line_subtotal: decimalString(source.line_subtotal, `${path}.line_subtotal`),
    personalization_fee: decimalString(source.personalization_fee, `${path}.personalization_fee`),
    line_total: decimalString(source.line_total, `${path}.line_total`),
    discount_active: boolean(source.discount_active, `${path}.discount_active`),
  };
}

function parseData(value: unknown, path: string): CartDataDto {
  const source = record(value, path);
  const city = source.city === undefined ? undefined : record(source.city, `${path}.city`);
  const totals = record(source.totals, `${path}.totals`);
  const freeShipping = record(totals.free_shipping, `${path}.totals.free_shipping`);
  const vat = record(totals.vat, `${path}.totals.vat`);
  const coupon = source.coupon === null ? null : record(source.coupon, `${path}.coupon`);
  const gift = record(source.gift, `${path}.gift`);

  return {
    token: optionalString(source.token, `${path}.token`),
    city: city
      ? { id: positiveInteger(city.id, `${path}.city.id`), name: string(city.name, `${path}.city.name`) }
      : undefined,
    items_count: nonNegativeInteger(source.items_count, `${path}.items_count`),
    lines_count: nonNegativeInteger(source.lines_count, `${path}.lines_count`),
    items: array(source.items, `${path}.items`).map((item, index) => parseLine(item, `${path}.items[${index}]`)),
    totals: {
      lines: array(totals.lines, `${path}.totals.lines`).map((line, index) => parseTotalsLine(line, `${path}.totals.lines[${index}]`)),
      items_count: nonNegativeInteger(totals.items_count, `${path}.totals.items_count`),
      lines_count: nonNegativeInteger(totals.lines_count, `${path}.totals.lines_count`),
      subtotal: decimalString(totals.subtotal, `${path}.totals.subtotal`),
      product_discount_total: decimalString(totals.product_discount_total, `${path}.totals.product_discount_total`),
      personalization_total: decimalString(totals.personalization_total, `${path}.totals.personalization_total`),
      coupon_discount: decimalString(totals.coupon_discount, `${path}.totals.coupon_discount`),
      gift_wrap_fee: decimalString(totals.gift_wrap_fee, `${path}.totals.gift_wrap_fee`),
      shipping_fee: totals.shipping_fee === null ? null : decimalString(totals.shipping_fee, `${path}.totals.shipping_fee`),
      free_shipping: {
        enabled: boolean(freeShipping.enabled, `${path}.totals.free_shipping.enabled`),
        threshold:
          freeShipping.threshold === null
            ? null
            : decimalString(freeShipping.threshold, `${path}.totals.free_shipping.threshold`),
        qualifies: boolean(freeShipping.qualifies, `${path}.totals.free_shipping.qualifies`),
        remaining:
          freeShipping.remaining === null
            ? null
            : decimalString(freeShipping.remaining, `${path}.totals.free_shipping.remaining`),
      },
      total: decimalString(totals.total, `${path}.totals.total`),
      vat: {
        rate: decimalString(vat.rate, `${path}.totals.vat.rate`),
        amount: decimalString(vat.amount, `${path}.totals.vat.amount`),
      },
      currency: string(totals.currency, `${path}.totals.currency`),
    },
    coupon: coupon
      ? {
          code: string(coupon.code, `${path}.coupon.code`),
          name: string(coupon.name, `${path}.coupon.name`),
          applied: boolean(coupon.applied, `${path}.coupon.applied`),
          discount: decimalString(coupon.discount, `${path}.coupon.discount`),
        }
      : null,
    gift: {
      is_gift: boolean(gift.is_gift, `${path}.gift.is_gift`),
      is_anonymous: boolean(gift.is_anonymous, `${path}.gift.is_anonymous`),
      gift_message: nullableString(gift.gift_message, `${path}.gift.gift_message`),
      gift_wrap: boolean(gift.gift_wrap, `${path}.gift.gift_wrap`),
      recipient: gift.recipient ?? null,
    },
  };
}

export function parseCartResponse(value: unknown): CartResponseDto {
  const source = record(value, "response");
  return {
    success: boolean(source.success, "response.success"),
    message: string(source.message, "response.message"),
    data: parseData(source.data, "response.data"),
  };
}
