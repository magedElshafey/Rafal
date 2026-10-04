import type { CreateOrderReturnDto } from "@/features/order-returns/api/order-return-dto";
import {
  orderReturnReasons,
  type OrderReturnReason,
  type OrderReturnReasonLabels,
} from "@/features/order-returns/types/order-return.types";

export function parseOrderReturnSubmissionInput(
  value: unknown,
): Readonly<{ reason: OrderReturnReason }> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;
  if (
    Object.keys(source).length !== 1 ||
    typeof source.reason !== "string" ||
    !(orderReturnReasons as readonly string[]).includes(source.reason)
  ) {
    return null;
  }

  return { reason: source.reason as OrderReturnReason };
}

export function mapOrderReturnSubmission(
  reason: OrderReturnReason,
): CreateOrderReturnDto {
  return { reason };
}

export function getOrderReturnReasonLabel(
  reason: OrderReturnReason,
  labels: OrderReturnReasonLabels,
): string {
  return labels[reason];
}
