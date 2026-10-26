import { ApiError } from "@/lib/api/api-error";

// Only codes emitted by the private boundary BEFORE calling backend Place prove
// no order was created. Backend 401/409/422/5xx and transport failures do not.
export function isDefinitivePrePlaceRejection(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return (error.status === 400 && (error.code === "invalid-input" || error.code === "invalid-locale")) ||
    (error.status === 409 && (error.code === "cart-session-unavailable" || error.code === "identity-mismatch"));
}
