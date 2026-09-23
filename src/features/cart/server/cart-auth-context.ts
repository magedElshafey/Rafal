import "server-only";

import type { CartTransportIdentity } from "@/features/cart/api/cart-api.server";
import { getGuestCartToken } from "@/features/cart/server/guest-cart-session";

// Real authentication does not yet expose a server-side bearer token. Keep
// this as the single activation seam and do not infer a token from mock users.
export async function resolveCartTransportIdentity(): Promise<CartTransportIdentity> {
  return { kind: "guest", token: await getGuestCartToken() };
}
