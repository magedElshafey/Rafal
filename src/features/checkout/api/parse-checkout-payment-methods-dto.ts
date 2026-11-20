import type { CheckoutBnpl, CheckoutPaymentMethodsResponseDto } from "@/features/checkout/api/checkout-payment-methods-dto";
import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

const { parseRecord, parseBoolean, parseString, parseNonEmptyString } = createRuntimeValidators(
  (path, expected) => new CheckoutContractError(path, expected),
);

// Isolate malformed optional BNPL data: disable that option without losing Card/Tap.
function parseBnpl(value: unknown): CheckoutBnpl | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const b = value as Record<string, unknown>;
  const decimal = (v: unknown): v is string => typeof v === "string" && /^\d+(?:\.\d+)?$/.test(v);
  if (typeof b.available !== "boolean" || (b.reason !== null && typeof b.reason !== "string") ||
    !decimal(b.min_amount) || !decimal(b.max_amount) ||
    typeof b.instalments !== "number" || !Number.isSafeInteger(b.instalments) || b.instalments <= 0 ||
    (b.instalment_amount !== null && !decimal(b.instalment_amount))) return null;
  return { available: b.available, reason: b.reason, min_amount: b.min_amount, max_amount: b.max_amount,
    instalments: b.instalments, instalment_amount: b.instalment_amount };
}

export function parseCheckoutPaymentMethodsResponse(value: unknown): CheckoutPaymentMethodsResponseDto {
  const source = parseRecord(value, "response");
  const data = parseRecord(source.data, "response.data");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    // Empty data is a valid unavailable state. Unknown codes are data, not capabilities.
    data: Object.fromEntries(Object.entries(data).map(([code, value]) => {
      parseNonEmptyString(code, "response.data method code");
      const method = parseRecord(value, "response.data method");
      return [code, {
        label: parseNonEmptyString(method.label, "response.data method.label"),
        icon: parseNonEmptyString(method.icon, "response.data method.icon"),
        ...(code === "tabby" || method.bnpl !== undefined ? { bnpl: parseBnpl(method.bnpl) } : {}),
      }];
    })),
  };
}
