"use client";

import { useRef, useState } from "react";
import type { Locale } from "next-intl";
import { loadLoyaltyHistory } from "../actions/load-loyalty-history";
import type { LoyaltyHistoryFilter, LoyaltyHistoryPage } from "../types/loyalty-history.types";

export function useLoyaltyHistory(locale: Locale, initialPage: LoyaltyHistoryPage | null) {
  const [filter, setFilter] = useState<LoyaltyHistoryFilter>("all");
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(!initialPage);
  const request = useRef({ id: 0, pending: false, filter: "all" as LoyaltyHistoryFilter });

  async function fetchPage(nextFilter: LoyaltyHistoryFilter, number: number, reset: boolean) {
    if (request.current.pending && nextFilter === request.current.filter) return;
    const id = ++request.current.id;
    request.current.pending = true;
    request.current.filter = nextFilter;
    setLoading(true);
    setError(false);
    if (reset) setPage(null);
    try {
      const result = await loadLoyaltyHistory(locale, nextFilter, number);
      if (id !== request.current.id) return;
      if (!result.ok) { setError(true); return; }
      setPage(previous => {
        const rows = reset ? result.page.data : [...(previous?.data ?? []), ...result.page.data];
        return { ...result.page, data: Array.from(new Map(rows.map(row => [row.id, row])).values()) };
      });
    } catch {
      if (id === request.current.id) setError(true);
    } finally {
      if (id === request.current.id) { request.current.pending = false; setLoading(false); }
    }
  }

  function changeFilter(next: LoyaltyHistoryFilter) {
    if (next === request.current.filter) return;
    setFilter(next);
    void fetchPage(next, 1, true);
  }
  const outOfRange = !!page && page.meta.current_page > page.meta.last_page;
  const hasMore = !!page && page.meta.current_page < page.meta.last_page;
  return { filter, page, loading, error, outOfRange, hasMore, changeFilter,
    loadMore: () => { if (hasMore || error) void fetchPage(filter, (page?.meta.current_page ?? 0) + 1, false); },
    restart: () => void fetchPage(filter, 1, true),
  };
}
