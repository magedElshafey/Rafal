import type { CheckoutPlaceResponseDto } from "@/features/checkout/api/checkout-place-dto";
import type { CheckoutPlaceResult } from "@/features/checkout/types/checkout.types";

export function mapCheckoutPlaceResult(
  response: CheckoutPlaceResponseDto,
): CheckoutPlaceResult {
  const { data } = response;
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
      taxableAmount: data.money.taxable_amount,
      vat: data.money.vat,
      total: data.money.total,
      currency: data.money.currency,
    },
  };
  const verificationRequired =
    data.requires_verification ||
    data.status === "pending_verification" ||
    response.meta?.requires_verification === true;

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
