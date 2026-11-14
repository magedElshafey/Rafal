import "server-only";
import type { Locale } from "next-intl";
import { requireUser } from "@/features/auth/server/auth-boundary";
import { getAccessToken } from "@/features/auth/server/auth-session";
import { serverApi } from "@/lib/api/server-api";
import { parseNotifications } from "./parse-notifications";

export async function getNotifications(locale: Locale) {
  await requireUser("/notifications", locale);
  const token = await getAccessToken();
  if (!token) throw new Error("An authenticated session is required.");
  const payload = await serverApi.request<unknown>({
    locale, path: "/notifications", method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseNotifications(payload);
}
