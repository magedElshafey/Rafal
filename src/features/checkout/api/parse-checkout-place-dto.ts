import type {
  CheckoutPlaceDataDto,
  CheckoutPlaceMoneyDto,
  CheckoutPlaceResponseDto,
  CheckoutPlaceShippingAddressDto,
  CheckoutPaymentDto,
  CheckoutPaymentHandoffDto,
} from "@/features/checkout/api/checkout-place-dto";
import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

const { parseBoolean, parseRecord, parseString, parseNonEmptyString } = createRuntimeValidators(
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
  const base = {
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
    total: decimalString(source.total, `${path}.total`),
    currency: parseNonEmptyString(source.currency, `${path}.currency`),
  };
  if (source.vat_amount !== undefined) {
    if (source.vat !== undefined || source.taxable_amount !== undefined) {
      throw new CheckoutContractError(path, "one supported VAT representation");
    }
    return { ...base, vat_amount: decimalString(source.vat_amount, `${path}.vat_amount`) };
  }
  const vat = parseRecord(source.vat, `${path}.vat`);
  return {
    ...base,
    taxable_amount: decimalString(source.taxable_amount, `${path}.taxable_amount`),
    vat: {
      rate: decimalString(vat.rate, `${path}.vat.rate`),
      amount: decimalString(vat.amount, `${path}.vat.amount`),
    },
  };
}

function timestamp(value: unknown, path: string): string {
  const parsed = parseNonEmptyString(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(parsed) || !Number.isFinite(Date.parse(parsed))) {
    throw new CheckoutContractError(path, "an ISO timestamp");
  }
  return parsed;
}

function parsePayment(value: unknown, path: string): CheckoutPaymentDto | null {
  if (value === undefined || value === null) return null;
  const source = parseRecord(value, path);
  return {
    method: parseNonEmptyString(source.method, `${path}.method`),
    status: parseNonEmptyString(source.status, `${path}.status`),
    paid_at: source.paid_at === null ? null : timestamp(source.paid_at, `${path}.paid_at`),
  };
}

function parseHandoff(value: unknown): CheckoutPaymentHandoffDto | null {
  if (value === undefined || value === null) return null;
  const path = "response.meta.payment";
  const source = parseRecord(value, path);
  const paymentUrl = parseNonEmptyString(source.payment_url, `${path}.payment_url`);
  // Structural validation only. Destination approval belongs to the future handoff boundary.
  try {
    const url = new URL(paymentUrl);
    if (url.protocol !== "https:" || url.username || url.password || paymentUrl !== paymentUrl.trim()) throw new Error();
  } catch {
    // Never include the URL (or the native URL error) in diagnostics.
    throw new CheckoutContractError(`${path}.payment_url`, "an absolute HTTPS URL without credentials");
  }
  return {
    payment_url: paymentUrl,
    charge_id: parseNonEmptyString(source.charge_id, `${path}.charge_id`),
    expires_at: timestamp(source.expires_at, `${path}.expires_at`),
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

function parseData(value: unknown, path: string, onOrderParsed?: () => void): CheckoutPlaceDataDto {
  const source = parseRecord(value, path);
  const id = positiveInteger(source.id, `${path}.id`);
  const orderNumber = parseNonEmptyString(source.order_number, `${path}.order_number`);
  onOrderParsed?.();
  return {
    id,
    order_number: orderNumber,
    display_number: parseNonEmptyString(
      source.display_number,
      `${path}.display_number`,
    ),
    status: parseNonEmptyString(source.status, `${path}.status`),
    payment: parsePayment(source.payment, `${path}.payment`),
    requires_verification: source.requires_verification === undefined ? null : parseBoolean(
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
  onOrderParsed?: () => void,
): CheckoutPlaceResponseDto {
  const source = parseRecord(value, "response");
  const meta =
    source.meta === null || source.meta === undefined
      ? null
      : parseRecord(source.meta, "response.meta");

  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseData(source.data, "response.data", onOrderParsed),
    meta: meta
      ? {
          payment: parseHandoff(meta.payment),
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
