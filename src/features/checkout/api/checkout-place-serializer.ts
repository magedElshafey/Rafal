import type { CheckoutPlaceRequestDto } from "@/features/checkout/api/checkout-place-dto";
import { serializeCheckoutQuoteRequest } from "@/features/checkout/api/checkout-serializer";
import type { CheckoutPlaceRequest } from "@/features/checkout/types/checkout.types";

const CHECKOUT_PAYMENT_COMPATIBILITY_STUB = "card";

export function serializeCheckoutPlaceRequest(
  input: CheckoutPlaceRequest,
): CheckoutPlaceRequestDto {
  const destination = serializeCheckoutQuoteRequest({
    destination: input.destination,
    shippingMethodId: input.shippingMethodId,
  });

  return {
    ...destination,
    shipping_method_id: String(input.shippingMethodId),
    payment_method: CHECKOUT_PAYMENT_COMPATIBILITY_STUB,
    ...(input.buyer.kind === "guest"
      ? {
          "guest[name]": input.buyer.name,
          "guest[email]": input.buyer.email,
          "guest[phone]": input.buyer.phone,
        }
      : {}),
  };
}
