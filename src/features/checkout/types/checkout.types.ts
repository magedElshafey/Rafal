export type CheckoutPaymentMethod = {
  code: string;
  label: string;
  icon: string;
};

export type CheckoutShippingMethod = {
  id: number;
  code: string;
  name: string;
  etaLabel: string;
  price: string;
  isPickup: boolean;
};

export type CheckoutOneTimeAddress = {
  recipientName: string;
  recipientPhone: string;
  district: string;
  streetDetails: string;
};

type CheckoutQuoteRequestBase = {
  cityId: number;
  shippingMethodId?: number;
};

export type CheckoutQuoteRequest = CheckoutQuoteRequestBase &
  (
    | { addressId: number; address?: never }
    | { addressId?: never; address: CheckoutOneTimeAddress }
  );

export type CheckoutQuoteShippingOption = {
  id: number;
  code: string;
  name: string;
  etaLabel: string;
  price: string;
  fee: string;
  isFree: boolean;
  isPickup: boolean;
};

export type CheckoutQuoteWarehouse = {
  id: number;
  name: string;
};

export type CheckoutQuoteLocation = {
  inCoverage: boolean;
  city: {
    id: number;
    name: string;
  };
};

export type CheckoutQuoteTotalsLine = {
  unitRegularPrice: string;
  unitPrice: string;
  discountPerUnit: string;
  quantity: number;
  lineSubtotal: string;
  personalizationFee: string;
  lineTotal: string;
  discountActive: boolean;
};

export type CheckoutQuoteTotals = {
  lines: readonly CheckoutQuoteTotalsLine[];
  itemsCount: number;
  linesCount: number;
  subtotal: string;
  productDiscountTotal: string;
  personalizationTotal: string;
  couponDiscount: string;
  giftWrapFee: string;
  shippingFee: string | null;
  freeShipping: {
    enabled: boolean;
    threshold: string | null;
    qualifies: boolean;
    remaining: string | null;
  };
  total: string;
  vat: {
    rate: string;
    includedAmount: string;
  };
  currency: string;
};

export type CheckoutQuoteCoupon = {
  code: string;
  name: string;
  applied: boolean;
  discount: string;
};

export type CheckoutQuote = {
  totals: CheckoutQuoteTotals;
  shippingOptions: readonly CheckoutQuoteShippingOption[];
  fulfillable: boolean;
  warehouse: CheckoutQuoteWarehouse | null;
  unavailableLines: readonly unknown[];
  coupon: CheckoutQuoteCoupon | null;
  location: CheckoutQuoteLocation;
};
export type CheckoutQuoteInputField =
  | "cityId"
  | "addressId"
  | "recipientName"
  | "recipientPhone"
  | "district"
  | "streetDetails";

export type CheckoutQuoteError =
  | { code: "invalid-input"; fields: readonly CheckoutQuoteInputField[] }
  | { code: "unauthorized" }
  | { code: "cart-session-unavailable" }
  | { code: "service-unavailable" };

export type CheckoutQuoteResult =
  | { ok: true; quote: CheckoutQuote }
  | { ok: false; error: CheckoutQuoteError };
