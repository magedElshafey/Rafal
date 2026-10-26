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

export type CheckoutVerifyRequestDto = {
  phone: string;
  otp: string;
};

type CheckoutPlaceMoneyBaseDto = {
  subtotal: string;
  discount_total: string;
  shipping_fee: string;
  personalization_total: string;
  gift_wrap_fee: string;
  total: string;
  currency: string;
};

export type CheckoutPlaceMoneyDto = CheckoutPlaceMoneyBaseDto & (
  | { taxable_amount: string; vat: { rate: string; amount: string }; vat_amount?: never }
  | { vat_amount: string; taxable_amount?: never; vat?: never }
);

export type CheckoutPaymentDto = {
  method: string;
  status: string;
  paid_at: string | null;
};

export type CheckoutPaymentHandoffDto = {
  payment_url: string;
  charge_id: string;
  expires_at: string;
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
  requires_verification: boolean | null;
  payment: CheckoutPaymentDto | null;
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
    payment: CheckoutPaymentHandoffDto | null;
    requires_verification: boolean | null;
    verification_expires_at: string | null;
  } | null;
};
