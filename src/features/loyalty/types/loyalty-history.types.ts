export const historyFilters = ["all", "earn", "redeem", "other"] as const;
export type LoyaltyHistoryFilter = (typeof historyFilters)[number];

export type LoyaltyHistoryEntry = {
  id: number;
  type: string;
  label: string;
  points: number;
  is_pending: boolean;
  expires_at: string | null;
  created_at: string;
  order: { order_number: string } | null;
};

export type LoyaltyHistoryPage = {
  data: LoyaltyHistoryEntry[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type HistoryResult = { ok: true; page: LoyaltyHistoryPage } | { ok: false };
