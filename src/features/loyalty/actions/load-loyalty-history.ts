"use server";

import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getLoyaltyHistory } from "../api/loyalty-history-api.server";
import { historyFilters, type HistoryResult, type LoyaltyHistoryFilter } from "../types/loyalty-history.types";

export async function loadLoyaltyHistory(locale: string, filter: LoyaltyHistoryFilter, page: number): Promise<HistoryResult> {
  if (!hasLocale(routing.locales, locale) || !historyFilters.includes(filter) || !Number.isSafeInteger(page) || page < 1) return { ok: false };
  try {
    return { ok: true, page: await getLoyaltyHistory(locale, filter, page) };
  } catch {
    return { ok: false };
  }
}
