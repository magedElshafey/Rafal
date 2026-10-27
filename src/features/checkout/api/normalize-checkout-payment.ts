import type { CheckoutPlaceResponseDto } from "@/features/checkout/api/checkout-place-dto";
import type { CheckoutPaymentOutcome, CheckoutPaymentOutcomeContext } from "@/features/checkout/types/checkout.types";

export function normalizeCheckoutPayment(response: CheckoutPlaceResponseDto): CheckoutPaymentOutcome {
  const { data, meta } = response;
  const payment = data.payment;
  const handoff = meta?.payment;
  const context: CheckoutPaymentOutcomeContext = {
    order: { id: data.id, orderNumber: data.order_number, displayNumber: data.display_number, status: data.status, placedAt: data.placed_at },
    payment: payment ? { method: payment.method, status: payment.status, paidAt: payment.paid_at } : null,
    verification: {
      required: data.requires_verification,
      metadataRequired: meta?.requires_verification ?? null,
      expiresAt: data.verification_expires_at ?? meta?.verification_expires_at ?? null,
    },
    money: {
      subtotal: data.money.subtotal, discountTotal: data.money.discount_total,
      shippingFee: data.money.shipping_fee, personalizationTotal: data.money.personalization_total,
      giftWrapFee: data.money.gift_wrap_fee, total: data.money.total, currency: data.money.currency,
      ...(data.money.vat !== undefined
        ? { format: "nested-vat" as const, taxableAmount: data.money.taxable_amount, vat: data.money.vat }
        : { format: "vat-amount" as const, vatAmount: data.money.vat_amount }),
    },
  };
  const unresolved = (reason: Extract<CheckoutPaymentOutcome, { kind: "unresolved" }>["reason"]): CheckoutPaymentOutcome =>
    ({ ...context, kind: "unresolved", nextAction: "none", reason });
  if (!response.success) return unresolved("unsuccessful");
  const required = data.requires_verification;
  const metadataRequired = meta?.requires_verification ?? null;
  const otp = required === true || metadataRequired === true || data.status === "pending_verification";
  if (
    (required !== null && metadataRequired !== null && required !== metadataRequired) ||
    (data.status === "pending_verification" && (required === false || metadataRequired === false)) ||
    (otp && (data.status === "confirmed" || payment?.status === "paid" || handoff)) ||
    (payment && payment.status !== "paid" && payment.paid_at !== null) ||
    (payment?.status === "paid" && (!payment.paid_at || handoff))
  ) return unresolved("contradictory");
  // Keep legacy Card variants; additional Guest methods use the observed OTP flags.
  const otpPaymentSupported = !payment ||
    (payment.status === "pending" && payment.paid_at === null &&
      (payment.method === "card" || (["apple_pay", "tap"].includes(payment.method) &&
        data.status === "pending_verification" && required === true && metadataRequired === true)));
  if (otp && otpPaymentSupported && !handoff && (data.status === "pending_verification" || data.status === "new")) {
    return { ...context, kind: "verification-required", nextAction: "verify-otp" };
  }
  if (!payment) return unresolved("missing-payment");
  if (!otp && data.status === "confirmed" && payment.status === "paid") {
    return { ...context, kind: "paid", nextAction: "confirm" };
  }
  if (!otp && data.status === "new" && ["card", "apple_pay", "tap"].includes(payment.method) && payment.status === "pending" && required === false) {
    if (!handoff) return unresolved("missing-handoff");
    return {
      ...context, kind: "hosted-payment-pending", nextAction: "hosted-payment",
      handoff: { paymentUrl: handoff.payment_url, chargeId: handoff.charge_id, expiresAt: handoff.expires_at },
    };
  }
  return unresolved("unsupported");
}
