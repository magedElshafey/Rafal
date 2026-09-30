import "server-only";

import type { Locale } from "next-intl";

import { getAccessToken } from "@/features/auth/server/auth-session";
import { ApiError } from "@/lib/api/api-error";
import { serverApi } from "@/lib/api/server-api";

type ProductReadRequest = Pick<
  Parameters<typeof serverApi.request>[0],
  "path" | "query" | "signal"
>;

// Public Product/Home reads may personalize with the HttpOnly session token.
// As with optional auth user reads, a rejected identity becomes guest context.
export async function optionalAuthProductRead(
  locale: Locale,
  request: ProductReadRequest,
): Promise<unknown> {
  const accessToken = await getAccessToken();
  const headers = { "Accept-Language": locale };
  try {
    return await serverApi.request<unknown>({
      ...request,
      headers: accessToken
        ? { ...headers, Authorization: `Bearer ${accessToken}` }
        : headers,
    });
  } catch (error) {
    if (!accessToken || !(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    // One guest read only; do not change cookies or global auth behavior here.
    return serverApi.request<unknown>({ ...request, headers });
  }
}
