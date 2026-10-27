import type { CheckoutPlaceRequestDto } from "@/features/checkout/api/checkout-place-dto";
import { serializeCheckoutQuoteRequest } from "@/features/checkout/api/checkout-serializer";
import type { CheckoutPlaceRequest } from "@/features/checkout/types/checkout.types";
import { canSelectCheckoutPayment } from "@/features/checkout/utils/checkout-payment-presentation";
import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";

export function serializeCheckoutPlaceRequest(
  input: CheckoutPlaceRequest,
): CheckoutPlaceRequestDto {
  if (!canSelectCheckoutPayment(input.paymentMethod ?? "card", true)) {
    throw new CheckoutContractError("request.paymentMethod", "an implemented payment method");
  }
  const destination = serializeCheckoutQuoteRequest({
    destination: input.destination,
    shippingMethodId: input.shippingMethodId,
  });

  return {
    ...destination,
    shipping_method_id: String(input.shippingMethodId),
    payment_method: input.paymentMethod ?? "card",
    ...(input.buyer.kind === "guest"
      ? {
          "guest[name]": input.buyer.name,
          "guest[email]": input.buyer.email,
          "guest[phone]": input.buyer.phone,
        }
      : {}),
  };
}
