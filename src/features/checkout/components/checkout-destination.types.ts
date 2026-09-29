import type { Address } from "@/features/addresses/types/address.types";
import type { CartGiftRecipient } from "@/features/cart/types/cart.types";
import type { City } from "@/features/location/types";
import type { CheckoutQuoteRequest } from "@/features/checkout/types/checkout.types";

export type CheckoutOneTimeAddressDraft = {
  recipientName: string;
  recipientPhone: string;
  city: Pick<City, "id" | "name"> | null;
  district: string;
  streetDetails: string;
};

export type CheckoutDestination =
  | { kind: "none" }
  | { kind: "gift-missing" }
  | {
      kind: "gift";
      recipient: CartGiftRecipient;
      request: CheckoutQuoteRequest;
    }
  | {
      kind: "saved";
      addressId: Address["id"];
      request: CheckoutQuoteRequest;
    }
  | {
      kind: "one-time";
      draft: CheckoutOneTimeAddressDraft;
      request: CheckoutQuoteRequest;
    };