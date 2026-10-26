import type { CheckoutPaymentMethodsResponseDto } from "@/features/checkout/api/checkout-payment-methods-dto";
import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

const { parseRecord, parseBoolean, parseString, parseNonEmptyString } = createRuntimeValidators(
  (path, expected) => new CheckoutContractError(path, expected),
);

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
      }];
    })),
  };
}
