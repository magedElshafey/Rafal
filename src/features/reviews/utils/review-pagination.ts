import type { PaginationMeta } from "@/lib/api/pagination";

export function getNextReviewPage(
  pagination: PaginationMeta,
  requestedPage: number,
): number | null {
  if (
    !pagination ||
    !Number.isSafeInteger(pagination.current_page) ||
    pagination.current_page !== requestedPage ||
    !Number.isSafeInteger(pagination.last_page) ||
    pagination.last_page < 1
  ) {
    throw new Error("Invalid review page identity");
  }
  return pagination.current_page < pagination.last_page
    ? pagination.current_page + 1
    : null;
}
