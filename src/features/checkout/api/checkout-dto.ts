export type CheckoutApiResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
};

type CheckoutQuoteRequestBaseDto = {
  city_id: string;
  shipping_method_id?: string;
};

export type CheckoutSavedAddressQuoteRequestDto =
  CheckoutQuoteRequestBaseDto & {
    address_id: string;
  };

export type CheckoutRawAddressQuoteRequestDto =
  CheckoutQuoteRequestBaseDto & {
    "address[recipient_name]": string;
    "address[recipient_phone]": string;
    "address[city_id]": string;
    "address[district]": string;
    "address[street_details]": string;
  };

export type CheckoutQuoteRequestDto =
  | CheckoutSavedAddressQuoteRequestDto
  | CheckoutRawAddressQuoteRequestDto;

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
    amount: string;
  };
  currency: string;
};

export type CheckoutQuoteCouponDto = {
  code: string;
  valid: boolean;
  reason: string | null;
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

export type CheckoutUnavailableLineDto = {
  cart_item_id: number;
  product_name: {
    ar: string;
    en: string;
  };
  requested: number;
  available: number;
  variant_total_requested: number;
};

export type CheckoutQuoteDataDto = {
  totals: CheckoutQuoteTotalsDto;
  shipping_options: readonly CheckoutQuoteShippingOptionDto[];
  fulfillable: boolean;
  warehouse: CheckoutQuoteWarehouseDto | null;
  unavailable_lines: readonly CheckoutUnavailableLineDto[];
  coupon: CheckoutQuoteCouponDto | null;
  location: CheckoutQuoteLocationDto;
};

export type CheckoutQuoteResponseDto =
  CheckoutApiResponse<CheckoutQuoteDataDto>;

export const checkoutContractEndpoints = {
  quote: "/checkout/quote",
  place: "/checkout/place",
} as const;
