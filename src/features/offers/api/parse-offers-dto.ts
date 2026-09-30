import type { CouponDto, OffersDto } from "@/features/offers/api/offers-dto";
import { couponTimestampToDate } from "@/features/offers/utils/coupon-date";
import { parseProductListResponse } from "@/features/products/api/parse-product-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class OffersContractError extends Error {
  constructor(path: string, expected: string) {
    super('Invalid Offers API payload at "' + path + '": expected ' + expected + '.');
    this.name = "OffersContractError";
  }
}

const { parseRecord, parseArray, parseString, parseNonEmptyString, parseFiniteNumber } =
  createRuntimeValidators((path, expected) => new OffersContractError(path, expected));

function nonNegative(value: unknown, path: string): number {
  const number = parseFiniteNumber(value, path);
  if (number < 0) throw new OffersContractError(path, "a non-negative number");
  return number;
}

function nullableAmount(value: unknown, path: string): number | null {
  return value === null ? null : nonNegative(value, path);
}

function parseCoupon(value: unknown, path: string): CouponDto {
  const source = parseRecord(value, path);
  if (source.type !== "percent" && source.type !== "fixed") {
    throw new OffersContractError(path + ".type", '"percent" or "fixed"');
  }
  const endsAt = source.ends_at === null ? null : parseNonEmptyString(source.ends_at, path + ".ends_at");
  if (endsAt !== null && !couponTimestampToDate(endsAt)) {
    throw new OffersContractError(path + ".ends_at", "a valid backend timestamp");
  }
  // Match the shared Product decimal-money validation convention.
  const estimated = parseNonEmptyString(source.estimated_discount, path + ".estimated_discount");
  if (!Number.isFinite(Number(estimated)) || Number(estimated) < 0) {
    throw new OffersContractError(path + ".estimated_discount", "a non-negative decimal string");
  }
  return {
    code: parseNonEmptyString(source.code, path + ".code"),
    name: parseNonEmptyString(source.name, path + ".name"),
    description: parseString(source.description, path + ".description"),
    type: source.type,
    value: nonNegative(source.value, path + ".value"),
    max_discount_amount: nullableAmount(source.max_discount_amount, path + ".max_discount_amount"),
    min_order_amount: nullableAmount(source.min_order_amount, path + ".min_order_amount"),
    ends_at: endsAt,
    estimated_discount: estimated,
  };
}

export function parseOffersDto(value: unknown): OffersDto {
  const source = parseRecord(value, "response");
  if (source.success !== true) throw new OffersContractError("response.success", "true");
  const message = parseString(source.message, "response.message");
  const data = parseRecord(source.data, "response.data");
  const products = parseRecord(data.discounted_products, "response.data.discounted_products");
  // Reuse Product item AND pagination parsing; optional unused meta.location
  // is accepted without introducing a second location model.
  const parsedProducts = parseProductListResponse({
    success: true, message, data: products.data, meta: products.meta,
  });
  return {
    success: true,
    message,
    data: {
      coupons: parseArray(data.coupons, "response.data.coupons").map((coupon, index) =>
        parseCoupon(coupon, "response.data.coupons[" + index + "]"),
      ),
      discounted_products: { data: parsedProducts.data, meta: parsedProducts.meta },
    },
  };
}
