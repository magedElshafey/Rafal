// Display only: the current Cart/Quote contract supplies VAT-exclusive components.
// Keep the decimal product exact; the existing currency formatter owns rounding.
// Never use this for total, amount_due, VAT itself, or payment requests.
export function vatInclusiveAmount(amount: string, rate: string): string {
  const decimal = (value: string) => {
    if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return { units: BigInt(whole + fraction), places: fraction.length };
  };
  const price = decimal(amount);
  const percent = decimal(rate);
  if (!price || !percent) return amount;
  const rateScale = BigInt(10) ** BigInt(percent.places + 2);
  const units = price.units * (rateScale + percent.units);
  const places = price.places + percent.places + 2;
  const digits = units.toString().padStart(places + 1, "0");
  const fraction = digits.slice(-places).replace(/0+$/, "");
  return digits.slice(0, -places) + (fraction ? `.${fraction}` : "");
}

// Reconcile independently formatted SAR rows without allocating tax to any row.
// This is a display difference, not a backend fee or a change to the total.
export function vatDisplayRounding(total: string, rate: string, currency: string,
  charges: readonly string[], discounts: readonly string[]): string | null {
  if (currency !== "SAR") return null;
  const formatter = new Intl.NumberFormat("en", {
    useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const minor = (amount: string) => BigInt(formatter.format(Number(amount)).replace(".", ""));
  const sum = (values: readonly string[]) => values.reduce(
    (value, amount) => value + minor(vatInclusiveAmount(amount, rate)), BigInt(0));
  const difference = minor(total) - sum(charges) + sum(discounts);
  const magnitude = difference < BigInt(0) ? -difference : difference;
  // Never disguise a substantive contract inconsistency as rounding.
  const rows = [...charges, ...discounts].filter(value => Number(value) !== 0).length;
  if (magnitude === BigInt(0) || magnitude > BigInt(Math.ceil((rows + 1) / 2))) return null;
  return `${difference < BigInt(0) ? "-" : ""}${magnitude / BigInt(100)}.${(magnitude % BigInt(100)).toString().padStart(2, "0")}`;
}
