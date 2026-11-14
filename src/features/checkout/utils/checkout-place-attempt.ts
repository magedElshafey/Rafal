import { ApiError } from "@/lib/api/api-error";

// Local preflight failures and confirmed upstream HTTP 409 responses establish
// that no order was created. 422/5xx, transport and malformed success do not.
export function isDefinitivePrePlaceRejection(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return (error.status === 400 && (error.code === "invalid-input" || error.code === "invalid-locale")) ||
    (error.status === 409 && (error.code === "cart-session-unavailable" || error.code === "identity-mismatch" ||
      error.code === "checkout-changed" || error.code === "unavailable-lines"));
}
