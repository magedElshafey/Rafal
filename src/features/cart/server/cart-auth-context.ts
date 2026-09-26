import "server-only";

import { getAccessToken } from "@/features/auth/server/auth-session";
import type { CartTransportIdentity } from "@/features/cart/api/cart-api.server";
import { getGuestCartToken } from "@/features/cart/server/guest-cart-session";

export async function resolveCartTransportIdentity(): Promise<CartTransportIdentity> {
  const accessToken = await getAccessToken();
  if (accessToken) {
    return { kind: "authenticated", bearerToken: accessToken };
  }
  return { kind: "guest", token: await getGuestCartToken() };
}
