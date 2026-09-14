export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export function getNextPageParam({
  current_page,
  last_page,
}: PaginationMeta): number | undefined {
  return current_page < last_page ? current_page + 1 : undefined;
}
