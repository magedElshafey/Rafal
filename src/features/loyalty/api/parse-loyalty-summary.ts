import type { LoyaltySummary } from "@/features/loyalty/types/loyalty.types";

// Only the fields consumed by the account summary are validated here.
function invalid(): never {
  throw new Error("Invalid Loyalty summary response.");
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}

function integer(value: unknown, signed = false): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || (!signed && value < 0)) return invalid();
  return value;
}

function decimal(value: unknown): string {
  if (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) return invalid();
  return value;
}

function flag(value: unknown): boolean {
  return typeof value === "boolean" ? value : invalid();
}

function date(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) return invalid();
  return value;
}

export function parseLoyaltySummary(payload: unknown): LoyaltySummary {
  const envelope = record(payload);
  if (envelope.success !== true) return invalid();
  const data = record(envelope.data);
  const settings = record(data.how_it_works);
  const expiring = data.expiring_soon === null ? null : record(data.expiring_soon);
  const percent = settings.max_redeem_percent;
  if (typeof percent !== "number" || !Number.isFinite(percent) || percent < 0 || percent > 100) return invalid();

  return {
    available: integer(data.available, true),
    valueSar: decimal(data.value_sar),
    pending: integer(data.pending),
    pendingAvailableOn: data.pending_available_on === null ? null : date(data.pending_available_on),
    expiringSoon: expiring === null ? null : { points: integer(expiring.points), expiresAt: date(expiring.expires_at) },
    isNegative: flag(data.is_negative),
    isPaused: flag(data.is_paused),
    howItWorks: {
      amountPerPoint: decimal(settings.amount_per_point),
      redeemPoints: integer(settings.redeem_points),
      redeemAmount: decimal(settings.redeem_amount),
      maxRedeemPercent: percent,
      minRedeemPoints: integer(settings.min_redeem_points),
      returnWindowDays: integer(settings.return_window_days),
      // Missing validity is not equivalent to an explicit no-expiry setting.
      validityMonths: settings.validity_months === undefined || settings.validity_months === null
        ? settings.validity_months
        : integer(settings.validity_months),
    },
  };
}
