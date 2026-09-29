export type CheckoutApiResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
};

export type CheckoutShippingMethodDto = {
  id: number;
  code: string;
  name: string;
  eta_label: string;
  price: string;
  is_pickup: boolean;
};

export type CheckoutShippingMethodsResponseDto = CheckoutApiResponse<
  readonly CheckoutShippingMethodDto[]
>;

export type CheckoutPaymentMethodDto = {
  label: string;
  icon: string;
};

export type CheckoutPaymentMethodsResponseDto = CheckoutApiResponse<
  Readonly<Record<string, CheckoutPaymentMethodDto>>
>;

export type CheckoutOneTimeAddressDto = {
  recipient_name: string;
  recipient_phone: string;
  district: string;
  street_details: string;
};

type CheckoutQuoteRequestBaseDto = {
  city_id: number;
  shipping_method_id?: number;
};

export type CheckoutSavedAddressQuoteRequestDto =
  CheckoutQuoteRequestBaseDto & {
    address_id: number;
    address?: never;
  };

export type CheckoutOneTimeAddressQuoteRequestDto =
  CheckoutQuoteRequestBaseDto & {
    address_id?: never;
    address: CheckoutOneTimeAddressDto;
  };

export type CheckoutQuoteRequestDto =
  | CheckoutSavedAddressQuoteRequestDto
  | CheckoutOneTimeAddressQuoteRequestDto;

export type CheckoutQuoteTotalsLineDto = {
  unit_regular_price: string;
  unit_price: string;
  discount_per_unit: string;
  quantity: number;
  line_subtotal: string;
  personalization_fee: string;
  line_total: string;
  discount_active: boolean;
};

export type CheckoutQuoteTotalsDto = {
  lines: readonly CheckoutQuoteTotalsLineDto[];
  items_count: number;
  lines_count: number;
  subtotal: string;
  product_discount_total: string;
  personalization_total: string;
  coupon_discount: string;
  gift_wrap_fee: string;
  shipping_fee: string | null;
  free_shipping: {
    enabled: boolean;
    threshold: string | null;
    qualifies: boolean;
    remaining: string | null;
  };
  total: string;
  vat: {
    rate: string;
    included_amount: string;
  };
  currency: string;
};

export type CheckoutQuoteCouponDto = {
  code: string;
  name: string;
  applied: boolean;
  discount: string;
};

export type CheckoutQuoteShippingOptionDto = {
  id: number;
  code: string;
  name: string;
  eta_label: string;
  price: string;
  fee: string;
  is_free: boolean;
  is_pickup: boolean;
};

export type CheckoutQuoteWarehouseDto = {
  id: number;
  name: string;
};

export type CheckoutQuoteLocationDto = {
  in_coverage: boolean;
  city: {
    id: number;
    name: string;
  };
};

export type CheckoutQuoteDataDto = {
  totals: CheckoutQuoteTotalsDto;
  shipping_options: readonly CheckoutQuoteShippingOptionDto[];
  fulfillable: boolean;
  warehouse: CheckoutQuoteWarehouseDto | null;
  unavailable_lines: readonly unknown[];
  coupon: CheckoutQuoteCouponDto | null;
  location: CheckoutQuoteLocationDto;
};

export type CheckoutQuoteResponseDto =
  CheckoutApiResponse<CheckoutQuoteDataDto>;

export const checkoutContractEndpoints = {
  shippingMethods: "/shipping-methods",
  paymentMethods: "/checkout/payment-methods",
  quote: "/checkout/quote",
} as const;
