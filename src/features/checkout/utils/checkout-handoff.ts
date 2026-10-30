import type {
  CheckoutPlaceResult,
  CheckoutPlacedMoney,
  CheckoutPlacedShippingAddress,
  CheckoutHostedPaymentResult,
  CheckoutPlaceRequest,
} from "@/features/checkout/types/checkout.types";
import { isValidSaudiMobile } from "@/lib/phone/saudi-mobile";
import { parseCheckoutHostedPaymentResult } from "@/features/checkout/api/parse-checkout-verify-result";

const VERIFICATION_KEY_PREFIX = "rafal:checkout:verification:";
const CONFIRMATION_KEY_PREFIX = "rafal:checkout:confirmation:";
const PAYMENT_KEY_PREFIX = "rafal:checkout:payment:";

export function storeCheckoutPaymentHandoff(result: CheckoutHostedPaymentResult): boolean {
  try {
    return write(storageKey(PAYMENT_KEY_PREFIX, result.orderNumber), parseCheckoutHostedPaymentResult(result));
  } catch { return false; }
}

export function readCheckoutPaymentHandoff(orderNumber: string): CheckoutHostedPaymentResult | null {
  try {
    // Keep expired context so a reload never turns a known handoff into another Verify.
    const result = parseCheckoutHostedPaymentResult(read(storageKey(PAYMENT_KEY_PREFIX, orderNumber)));
    return result.orderNumber === orderNumber ? result : null;
  } catch { return null; }
}

export type CheckoutVerificationHandoff = {
  orderNumber: string;
  displayNumber: string;
  phone: string;
  verificationExpiresAt: string | null;
  paymentMethod?: CheckoutPlaceRequest["paymentMethod"];
};

export type CheckoutConfirmationHandoff = {
  orderNumber: string;
  displayNumber: string;
  shippingAddress: CheckoutPlacedShippingAddress;
  money: CheckoutPlacedMoney;
};

function storageKey(prefix: string, orderNumber: string) {
  return `${prefix}${orderNumber}`;
}

function write(key: string, value: unknown): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function read(key: string): unknown {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function storeCheckoutVerificationHandoff(
  result: Extract<CheckoutPlaceResult, { kind: "verification-required" }>,
  phone: string,
): boolean {
  if (!isValidSaudiMobile(phone)) return false;
  return write(storageKey(VERIFICATION_KEY_PREFIX, result.orderNumber), {
    orderNumber: result.orderNumber,
    displayNumber: result.displayNumber,
    phone,
    verificationExpiresAt: result.verificationExpiresAt,
    ...(result.paymentMethod === undefined ? {} : { paymentMethod: result.paymentMethod }),
  } satisfies CheckoutVerificationHandoff);
}

export function readCheckoutVerificationHandoff(
  orderNumber: string,
): CheckoutVerificationHandoff | null {
  const value = read(storageKey(VERIFICATION_KEY_PREFIX, orderNumber));
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const context = value as Record<string, unknown>;
  return context.orderNumber === orderNumber &&
    (context.paymentMethod === undefined || context.paymentMethod === "card" ||
      context.paymentMethod === "apple_pay" || context.paymentMethod === "tap") &&
    typeof context.displayNumber === "string" &&
    typeof context.phone === "string" && isValidSaudiMobile(context.phone) &&
    (context.verificationExpiresAt === null ||
      typeof context.verificationExpiresAt === "string")
    ? (context as CheckoutVerificationHandoff)
    : null;
}

export function clearCheckoutVerificationHandoff(
  orderNumber: string,
): boolean {
  try {
    sessionStorage.removeItem(
      storageKey(VERIFICATION_KEY_PREFIX, orderNumber),
    );
    return true;
  } catch {
    return false;
  }
}

export function storeCheckoutConfirmationHandoff(
  result: Extract<CheckoutPlaceResult, { kind: "confirmed" }>,
): boolean {
  return write(storageKey(CONFIRMATION_KEY_PREFIX, result.orderNumber), {
    orderNumber: result.orderNumber,
    displayNumber: result.displayNumber,
    shippingAddress: result.shippingAddress,
    money: result.money,
  } satisfies CheckoutConfirmationHandoff);
}

export function readCheckoutConfirmationHandoff(
  orderNumber: string,
): CheckoutConfirmationHandoff | null {
  const value = read(storageKey(CONFIRMATION_KEY_PREFIX, orderNumber));
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const context = value as Record<string, unknown>;
  const address = context.shippingAddress;
  const money = context.money;
  if (
    context.orderNumber !== orderNumber ||
    typeof context.displayNumber !== "string" ||
    typeof address !== "object" ||
    address === null ||
    Array.isArray(address) ||
    typeof money !== "object" ||
    money === null ||
    Array.isArray(money)
  ) {
    return null;
  }
  const addressRecord = address as Record<string, unknown>;
  const city = addressRecord.city;
  const moneyRecord = money as Record<string, unknown>;
  const cityIsValid =
    city === null ||
    (typeof city === "object" &&
      city !== null &&
      !Array.isArray(city) &&
      Number.isSafeInteger((city as Record<string, unknown>).id) &&
      ((city as Record<string, unknown>).id as number) > 0 &&
      typeof (city as Record<string, unknown>).name === "string");
  return typeof addressRecord.recipientName === "string" &&
    typeof addressRecord.recipientPhone === "string" &&
    cityIsValid &&
    typeof addressRecord.district === "string" &&
    typeof addressRecord.streetDetails === "string" &&
    typeof moneyRecord.total === "string" &&
    typeof moneyRecord.currency === "string"
    ? (context as CheckoutConfirmationHandoff)
    : null;
}
