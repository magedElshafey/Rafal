import type { CheckoutOrderLoyalty } from "@/features/checkout/types/checkout.types";
import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

const { parseRecord, parseString } = createRuntimeValidators(
  (path, expected) => new CheckoutContractError(path, expected),
);

export function parseCheckoutOrderLoyalty(value: unknown): CheckoutOrderLoyalty | null {
  if (value == null) return null;
  const path = "order.loyalty";
  const source = parseRecord(value, path);
  const points = (key: string) => {
    const value = source[key];
    if (!Number.isSafeInteger(value) || (value as number) < 0) throw new CheckoutContractError(`${path}.${key}`, "a non-negative integer");
    return value as number;
  };
  const money = (key: string) => {
    const value = parseString(source[key], `${path}.${key}`);
    if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw new CheckoutContractError(`${path}.${key}`, "a decimal money string");
    return value;
  };
  const availableOn = source.available_on === null ? null : parseString(source.available_on, `${path}.available_on`);
  if (availableOn !== null && !Number.isFinite(Date.parse(availableOn))) throw new CheckoutContractError(`${path}.available_on`, "a timestamp");
  return {
    points_earned: points("points_earned"),
    earned_status: source.earned_status === null ? null : parseString(source.earned_status, `${path}.earned_status`),
    available_on: availableOn,
    return_window_days: points("return_window_days"),
    points_redeemed: points("points_redeemed"),
    amount_applied: money("amount_applied"),
    amount_due: money("amount_due"),
    points_returned: points("points_returned"),
  };
}
