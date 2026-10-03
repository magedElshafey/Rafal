import type {
  CheckoutPlaceDataDto,
  CheckoutPlaceMoneyDto,
  CheckoutPlaceResponseDto,
  CheckoutPlaceShippingAddressDto,
} from "@/features/checkout/api/checkout-place-dto";
import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

const { parseBoolean, parseRecord, parseString } = createRuntimeValidators(
  (path, expected) => new CheckoutContractError(path, expected),
);

function positiveInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new CheckoutContractError(path, "a positive integer");
  }
  return value as number;
}

function decimalString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new CheckoutContractError(path, "a non-negative decimal string");
  }
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new CheckoutContractError(path, "a non-negative decimal string");
  }
  return normalized;
}

function nullableString(value: unknown, path: string): string | null {
  return value === null || value === undefined
    ? null
    : parseString(value, path);
}

function parseMoney(value: unknown, path: string): CheckoutPlaceMoneyDto {
  const source = parseRecord(value, path);
  const vat = parseRecord(source.vat, `${path}.vat`);
  return {
    subtotal: decimalString(source.subtotal, `${path}.subtotal`),
    discount_total: decimalString(
      source.discount_total,
      `${path}.discount_total`,
    ),
    shipping_fee: decimalString(source.shipping_fee, `${path}.shipping_fee`),
    personalization_total: decimalString(
      source.personalization_total,
      `${path}.personalization_total`,
    ),
    gift_wrap_fee: decimalString(
      source.gift_wrap_fee,
      `${path}.gift_wrap_fee`,
    ),
    taxable_amount: decimalString(
      source.taxable_amount,
      `${path}.taxable_amount`,
    ),
    vat: {
      rate: decimalString(vat.rate, `${path}.vat.rate`),
      amount: decimalString(vat.amount, `${path}.vat.amount`),
    },
    total: decimalString(source.total, `${path}.total`),
    currency: parseString(source.currency, `${path}.currency`),
  };
}

function parseShippingAddress(
  value: unknown,
  path: string,
): CheckoutPlaceShippingAddressDto {
  const source = parseRecord(value, path);
  const city =
    source.city === null ? null : parseRecord(source.city, `${path}.city`);
  return {
    recipient_name: parseString(
      source.recipient_name,
      `${path}.recipient_name`,
    ),
    recipient_phone: parseString(
      source.recipient_phone,
      `${path}.recipient_phone`,
    ),
    city:
      city === null
        ? null
        : {
            id: positiveInteger(city.id, `${path}.city.id`),
            name: parseString(city.name, `${path}.city.name`),
          },
    district: parseString(source.district, `${path}.district`),
    street_details: parseString(
      source.street_details,
      `${path}.street_details`,
    ),
  };
}

function parseData(value: unknown, path: string): CheckoutPlaceDataDto {
  const source = parseRecord(value, path);
  return {
    id: positiveInteger(source.id, `${path}.id`),
    order_number: parseString(source.order_number, `${path}.order_number`),
    display_number: parseString(
      source.display_number,
      `${path}.display_number`,
    ),
    status: parseString(source.status, `${path}.status`),
    requires_verification: parseBoolean(
      source.requires_verification,
      `${path}.requires_verification`,
    ),
    placed_at: parseString(source.placed_at, `${path}.placed_at`),
    shipping_address: parseShippingAddress(
      source.shipping_address,
      `${path}.shipping_address`,
    ),
    money: parseMoney(source.money, `${path}.money`),
    verification_expires_at: nullableString(
      source.verification_expires_at,
      `${path}.verification_expires_at`,
    ),
  };
}

export function parseCheckoutPlaceResponse(
  value: unknown,
): CheckoutPlaceResponseDto {
  const source = parseRecord(value, "response");
  const meta =
    source.meta === null || source.meta === undefined
      ? null
      : parseRecord(source.meta, "response.meta");

  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseData(source.data, "response.data"),
    meta: meta
      ? {
          requires_verification:
            meta.requires_verification === undefined
              ? null
              : parseBoolean(
                  meta.requires_verification,
                  "response.meta.requires_verification",
                ),
          verification_expires_at: nullableString(
            meta.verification_expires_at,
            "response.meta.verification_expires_at",
          ),
        }
      : null,
  };
}
