import "server-only";

import { GuestCartSessionError } from "@/features/cart/server/guest-cart-session";
import type { CartMutationError } from "@/features/cart/types/cart.types";
import { ApiError } from "@/lib/api/api-error";

function validationFields(details: unknown): readonly string[] {
  if (typeof details !== "object" || details === null || Array.isArray(details)) return [];
  return Object.keys(details as Record<string, unknown>);
}

export function mapCartActionError(error: unknown): CartMutationError {
  if (error instanceof GuestCartSessionError) return { code: "cart-session-failure" };
  if (error instanceof ApiError) {
    if (error.status === 404) return { code: "line-not-found" };
    if (error.status === 422) {
      const fields = validationFields(error.details);
      if (fields.some((field) => field.startsWith("personalization_"))) {
        return { code: "invalid-personalization" };
      }
      return { code: "validation-rejected", fields };
    }
  }
  return { code: "service-unavailable" };
}
