import type { CheckoutQuoteRequestDto } from "@/features/checkout/api/checkout-dto";
import type {
  CheckoutAddress,
  CheckoutQuoteRequest,
} from "@/features/checkout/types/checkout.types";

function serializeRawAddress(
  address: CheckoutAddress,
  shippingMethodId: number | undefined,
): CheckoutQuoteRequestDto {
  const cityId = String(address.cityId);

  return {
    city_id: cityId,
    ...(shippingMethodId === undefined
      ? {}
      : { shipping_method_id: String(shippingMethodId) }),
    "address[recipient_name]": address.recipientName,
    "address[recipient_phone]": address.recipientPhone,
    "address[city_id]": cityId,
    "address[district]": address.district,
    "address[street_details]": address.streetDetails,
  };
}

export function serializeCheckoutQuoteRequest(
  input: CheckoutQuoteRequest,
): CheckoutQuoteRequestDto {
  const { destination, shippingMethodId } = input;

  if (destination.kind === "saved-address") {
    return {
      city_id: String(destination.cityId),
      address_id: String(destination.addressId),
      ...(shippingMethodId === undefined
        ? {}
        : { shipping_method_id: String(shippingMethodId) }),
    };
  }

  return serializeRawAddress(
    destination.kind === "gift-recipient"
      ? destination.recipient
      : destination.address,
    shippingMethodId,
  );
}
