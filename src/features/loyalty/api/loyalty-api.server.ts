import "server-only";

import type { Locale } from "next-intl";

import { requireUser } from "@/features/auth/server/auth-boundary";
import { getAccessToken } from "@/features/auth/server/auth-session";
import { parseLoyaltySummary } from "@/features/loyalty/api/parse-loyalty-summary";
import { serverApi } from "@/lib/api/server-api";

export async function getLoyaltySummary(locale: Locale) {
  await requireUser("/account/loyalty", locale);
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("An authenticated session is required for Loyalty.");

  const payload = await serverApi.request<unknown>({
    locale,
    path: "/loyalty",
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseLoyaltySummary(payload);
}
