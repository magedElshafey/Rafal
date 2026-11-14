// Only the empty paginated envelope is verified. Never interpret unknown items
// or mistake an empty out-of-range page for an empty inbox.
export function parseNotifications(value: unknown): "empty" | "unavailable" {
  if (!value || typeof value !== "object") throw new Error("Invalid notifications response");
  const source = value as Record<string, unknown>;
  const meta = source.meta as Record<string, unknown> | null;
  if (source.success !== true || !Array.isArray(source.data) || !meta ||
    !["current_page", "last_page", "per_page", "total"].every(key => Number.isSafeInteger(meta[key])) ||
    Number(meta.current_page) < 1 || Number(meta.last_page) < 1 || Number(meta.per_page) < 1 || Number(meta.total) < 0) {
    throw new Error("Invalid notifications response");
  }
  return source.data.length === 0 && meta.total === 0 && meta.current_page === 1 && meta.last_page === 1
    ? "empty" : "unavailable";
}
