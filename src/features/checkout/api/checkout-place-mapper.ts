import type { CheckoutPlaceResponseDto } from "@/features/checkout/api/checkout-place-dto";
import type { CheckoutPlaceResult } from "@/features/checkout/types/checkout.types";
import { normalizeCheckoutPayment } from "@/features/checkout/api/normalize-checkout-payment";
import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { decideCheckoutPayment } from "@/features/checkout/utils/checkout-payment-decision";
import type { CheckoutPlaceDiagnostics } from "@/features/checkout/server/checkout-place-diagnostics";

export function mapCheckoutPlaceResult(
  response: CheckoutPlaceResponseDto,
  diagnostics?: CheckoutPlaceDiagnostics,
): CheckoutPlaceResult {
  const { data } = response;
  diagnostics?.stage("payment-normalization");
  const outcome = normalizeCheckoutPayment(response);
  diagnostics?.stage("result-mapping");
  const decision = decideCheckoutPayment(outcome);
  // Existing consumers understand only OTP and established order confirmation.
  // Missing payment is never classified as paid by the new normalizer.
  const legacyConfirmation = response.success && !data.payment && !response.meta?.payment &&
    data.status === "confirmed" && data.requires_verification === false &&
    response.meta?.requires_verification !== true;
  diagnostics?.paymentDecision({
    orderStatus: data.status,
    paymentMethod: data.payment?.method,
    paymentStatus: data.payment?.status,
    paidAtPresent: data.payment?.paid_at != null,
    requiresVerification: data.requires_verification,
    outcomeKind: outcome.kind,
    decisionAction: decision.action,
    legacyConfirmation,
  });
  if (decision.action === "hold" && !legacyConfirmation) {
    throw new CheckoutContractError("response.data", "a result supported by the existing Checkout flow");
  }
  const order = {
    id: data.id,
    orderNumber: data.order_number,
    displayNumber: data.display_number,
    placedAt: data.placed_at,
    shippingAddress: {
      recipientName: data.shipping_address.recipient_name,
      recipientPhone: data.shipping_address.recipient_phone,
      city:
        data.shipping_address.city === null
          ? null
          : {
              id: data.shipping_address.city.id,
              name: data.shipping_address.city.name,
            },
      district: data.shipping_address.district,
      streetDetails: data.shipping_address.street_details,
    },
    money: {
      subtotal: data.money.subtotal,
      discountTotal: data.money.discount_total,
      shippingFee: data.money.shipping_fee,
      personalizationTotal: data.money.personalization_total,
      giftWrapFee: data.money.gift_wrap_fee,
      ...(data.money.vat !== undefined
        ? { taxableAmount: data.money.taxable_amount, vat: data.money.vat }
        : { vatAmount: data.money.vat_amount }),
      total: data.money.total,
      currency: data.money.currency,
    },
  };
  const verificationRequired = decision.action === "verify-otp";

  return verificationRequired
    ? {
        kind: "verification-required",
        ...order,
        verificationExpiresAt:
          data.verification_expires_at ??
          response.meta?.verification_expires_at ??
          null,
      }
    : { kind: "confirmed", ...order };
}
