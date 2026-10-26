import type { CheckoutPlaceResult } from "@/features/checkout/types/checkout.types";
import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

const { parseRecord, parseString, parseNonEmptyString } = createRuntimeValidators(
  (path, expected) => new CheckoutContractError(path, expected),
);

function id(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw new CheckoutContractError(path, "a positive integer");
  return value as number;
}

function money(value: unknown, path: string): string {
  const parsed = parseNonEmptyString(value, path);
  if (!/^\d+(?:\.\d+)?$/.test(parsed)) throw new CheckoutContractError(path, "a non-negative decimal string");
  return parsed;
}

// Validates the existing private-route result, NOT Laravel's payment contract.
// Unknown branches must fail before client Cart cleanup or confirmation navigation.
export function parseCheckoutPlaceResult(value: unknown): CheckoutPlaceResult {
  const source = parseRecord(value, "result");
  if (source.kind !== "confirmed" && source.kind !== "verification-required") {
    throw new CheckoutContractError("result.kind", "an established Checkout result");
  }
  const address = parseRecord(source.shippingAddress, "result.shippingAddress");
  const city = address.city === null ? null : parseRecord(address.city, "result.shippingAddress.city");
  const totals = parseRecord(source.money, "result.money");
  const tax = parseTax(totals);
  const order = {
    id: id(source.id, "result.id"),
    orderNumber: parseNonEmptyString(source.orderNumber, "result.orderNumber"),
    displayNumber: parseNonEmptyString(source.displayNumber, "result.displayNumber"),
    placedAt: parseNonEmptyString(source.placedAt, "result.placedAt"),
    shippingAddress: {
      recipientName: parseString(address.recipientName, "result.shippingAddress.recipientName"),
      recipientPhone: parseString(address.recipientPhone, "result.shippingAddress.recipientPhone"),
      city: city === null ? null : { id: id(city.id, "result.shippingAddress.city.id"), name: parseString(city.name, "result.shippingAddress.city.name") },
      district: parseString(address.district, "result.shippingAddress.district"),
      streetDetails: parseString(address.streetDetails, "result.shippingAddress.streetDetails"),
    },
    money: {
      subtotal: money(totals.subtotal, "result.money.subtotal"),
      discountTotal: money(totals.discountTotal, "result.money.discountTotal"),
      shippingFee: money(totals.shippingFee, "result.money.shippingFee"),
      personalizationTotal: money(totals.personalizationTotal, "result.money.personalizationTotal"),
      giftWrapFee: money(totals.giftWrapFee, "result.money.giftWrapFee"),
      ...tax,
      total: money(totals.total, "result.money.total"),
      currency: parseNonEmptyString(totals.currency, "result.money.currency"),
    },
  };
  return source.kind === "confirmed" ? { ...order, kind: "confirmed" } : {
    ...order, kind: "verification-required",
    verificationExpiresAt: source.verificationExpiresAt === null ? null : parseString(source.verificationExpiresAt, "result.verificationExpiresAt"),
  };
}

function parseTax(totals: Record<string, unknown>) {
  if (totals.vatAmount !== undefined) {
    if (totals.vat !== undefined || totals.taxableAmount !== undefined) {
      throw new CheckoutContractError("result.money", "one supported VAT representation");
    }
    return { vatAmount: money(totals.vatAmount, "result.money.vatAmount") };
  }
  const vat = parseRecord(totals.vat, "result.money.vat");
  return {
    taxableAmount: money(totals.taxableAmount, "result.money.taxableAmount"),
    vat: { rate: money(vat.rate, "result.money.vat.rate"), amount: money(vat.amount, "result.money.vat.amount") },
  };
}
