export type CheckoutConflictTotals = {
  total: string;
  vat: { amount: string };
  loyalty: { points_used: number; amount_applied: string };
  amount_due: string;
};

// Only public financial fields from errors.totals may cross the private boundary.
export function parseCheckoutConflictTotals(value: unknown): CheckoutConflictTotals | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const vat = source.vat as Record<string, unknown> | null;
  const loyalty = source.loyalty as Record<string, unknown> | null;
  const money = (value: unknown): value is string =>
    typeof value === "string" && /^[0-9]+(?:\.[0-9]+)?$/.test(value) && Number.isFinite(Number(value));
  if (!vat || !loyalty || !money(source.total) || !money(vat.amount) ||
    !money(loyalty.amount_applied) || !money(source.amount_due) ||
    !Number.isSafeInteger(loyalty.points_used) || (loyalty.points_used as number) < 0 ||
    (loyalty.amount_due !== undefined && (!money(loyalty.amount_due) || Number(loyalty.amount_due) !== Number(source.amount_due)))) return null;
  return {
    total: source.total, vat: { amount: vat.amount },
    loyalty: { points_used: loyalty.points_used as number, amount_applied: loyalty.amount_applied },
    amount_due: source.amount_due,
  };
}
