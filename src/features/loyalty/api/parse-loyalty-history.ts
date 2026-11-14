import type { LoyaltyHistoryPage } from "../types/loyalty-history.types";

export function parseLoyaltyHistory(payload: unknown, requestedPage: number): LoyaltyHistoryPage {
  const invalid = () => { throw new Error("Invalid Loyalty history response"); };
  if (!payload || typeof payload !== "object") return invalid();
  const { success, data, meta } = payload as Record<string, unknown>;
  if (success !== true || !Array.isArray(data) || !meta || typeof meta !== "object") return invalid();
  const m = meta as Record<string, unknown>;
  if (m.current_page !== requestedPage || m.per_page !== 20 ||
    !Number.isSafeInteger(m.last_page) || (m.last_page as number) < 1 ||
    !Number.isSafeInteger(m.total) || (m.total as number) < 0) return invalid();
  const validDate = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
  for (const row of data) {
    if (!row || typeof row !== "object" || !Number.isSafeInteger(row.id) ||
      typeof row.type !== "string" || typeof row.label !== "string" ||
      !Number.isSafeInteger(row.points) || typeof row.is_pending !== "boolean" ||
      !validDate(row.created_at) || (row.expires_at !== null && !validDate(row.expires_at)) ||
      (row.order !== null && (!row.order || typeof row.order.order_number !== "string" || !row.order.order_number))) return invalid();
  }
  return { data, meta: m as LoyaltyHistoryPage["meta"] };
}
