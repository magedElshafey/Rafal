export function parseCheckoutBackendId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}