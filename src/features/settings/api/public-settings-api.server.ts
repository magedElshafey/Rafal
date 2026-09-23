import "server-only";

import type { PublicSettings } from "@/features/settings/types/public-settings.types";
import { serverApi } from "@/lib/api/server-api";

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`Invalid Public Settings API payload at "${field}".`);
  return value as Record<string, unknown>;
}
function nonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`Invalid Public Settings API payload at "${field}".`);
  return value;
}
function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new Error(`Invalid Public Settings API payload at "${field}".`);
  return value;
}
function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`Invalid Public Settings API payload at "${field}".`);
  return value;
}
function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Invalid Public Settings API payload at "${field}".`);
  return value;
}

export async function getPublicSettingsFromApi(): Promise<PublicSettings> {
  const response = record(await serverApi.request<unknown>({ path: "/settings/public" }), "response");
  if (boolean(response.success, "response.success") !== true) {
    throw new Error("The Public Settings API returned an unsuccessful response.");
  }
  string(response.message, "response.message");
  const data = record(response.data, "response.data");
  return {
    vatRate: nonNegativeNumber(data.vat_rate, "data.vat_rate"),
    freeShippingEnabled: boolean(data.free_shipping_enabled, "data.free_shipping_enabled"),
    freeShippingThreshold: nonNegativeNumber(data.free_shipping_threshold, "data.free_shipping_threshold"),
    giftWrapEnabled: boolean(data.gift_wrap_enabled, "data.gift_wrap_enabled"),
    giftWrapFee: nonNegativeNumber(data.gift_wrap_fee, "data.gift_wrap_fee"),
    maxAddressesPerUser: positiveInteger(data.max_addresses_per_user, "data.max_addresses_per_user"),
    maxCartItemQuantity: positiveInteger(data.max_cart_item_quantity, "data.max_cart_item_quantity"),
    otpResendCooldownSeconds: nonNegativeNumber(data.otp_resend_cooldown_seconds, "data.otp_resend_cooldown_seconds"),
    currency: string(data.currency, "data.currency"),
  };
}
