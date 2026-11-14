import "server-only";
import type { Locale } from "next-intl";
import { getAccessToken } from "@/features/auth/server/auth-session";
import { serverApi } from "@/lib/api/server-api";
import { parseLoyaltyHistory } from "./parse-loyalty-history";
import type { LoyaltyHistoryFilter } from "../types/loyalty-history.types";

export async function getLoyaltyHistory(locale: Locale, type: LoyaltyHistoryFilter = "all", page = 1) {
  const token = await getAccessToken();
  if (!token) throw new Error("Loyalty history requires an authenticated session");
  const payload = await serverApi.request<unknown>({
    locale, path: "/loyalty/history", method: "GET",
    query: { type, page, per_page: 20 },
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseLoyaltyHistory(payload, page);
}
