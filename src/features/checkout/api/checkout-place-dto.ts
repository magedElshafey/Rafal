import type { CheckoutQuoteRequestDto } from "@/features/checkout/api/checkout-dto";

type CheckoutPlaceFieldsDto = {
  shipping_method_id: string;
  payment_method: string;
  "guest[name]"?: string;
  "guest[email]"?: string;
  "guest[phone]"?: string;
};

export type CheckoutPlaceRequestDto = CheckoutQuoteRequestDto &
  CheckoutPlaceFieldsDto;

export type CheckoutPlaceMoneyDto = {
  subtotal: string;
  discount_total: string;
  shipping_fee: string;
  personalization_total: string;
  gift_wrap_fee: string;
  taxable_amount: string;
  vat: { rate: string; amount: string };
  total: string;
  currency: string;
};

export type CheckoutPlaceShippingAddressDto = {
  recipient_name: string;
  recipient_phone: string;
  city: { id: number; name: string } | null;
  district: string;
  street_details: string;
};

export type CheckoutPlaceDataDto = {
  id: number;
  order_number: string;
  display_number: string;
  status: string;
  requires_verification: boolean;
  placed_at: string;
  shipping_address: CheckoutPlaceShippingAddressDto;
  money: CheckoutPlaceMoneyDto;
  verification_expires_at: string | null;
};

export type CheckoutPlaceResponseDto = {
  success: boolean;
  message: string;
  data: CheckoutPlaceDataDto;
  meta: {
    requires_verification: boolean | null;
    verification_expires_at: string | null;
  } | null;
};
