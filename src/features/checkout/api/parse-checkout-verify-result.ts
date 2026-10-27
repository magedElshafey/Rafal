import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { parseCheckoutPlaceResult } from "@/features/checkout/api/parse-checkout-place-result";
import type { CheckoutVerifyResult } from "@/features/checkout/types/checkout.types";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";
import { parseCheckoutHostedPaymentResult } from "@/features/checkout/api/parse-checkout-hosted-payment";

const { parseRecord } = createRuntimeValidators((path, expected) => new CheckoutContractError(path, expected));
export { parseCheckoutHostedPaymentResult };

export function parseCheckoutVerifyResult(value: unknown): CheckoutVerifyResult {
  const source = parseRecord(value, "result");
  if (source.kind === "hosted-payment-required") return parseCheckoutHostedPaymentResult(source, Date.now());
  const result = parseCheckoutPlaceResult(source);
  if (result.kind !== "confirmed") throw new CheckoutContractError("result.kind", "a confirmed order");
  return result;
}
