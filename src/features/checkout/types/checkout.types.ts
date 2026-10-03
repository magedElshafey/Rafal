export type CheckoutAddress = Readonly<{
  recipientName: string;
  recipientPhone: string;
  cityId: number;
  district: string;
  streetDetails: string;
}>;

export type CheckoutDestination =
  | Readonly<{
      kind: "saved-address";
      addressId: number;
      cityId: number;
    }>
  | Readonly<{
      kind: "one-time-address";
      address: CheckoutAddress;
    }>
  | Readonly<{
      kind: "gift-recipient";
      recipient: CheckoutAddress;
    }>;

export type CheckoutQuoteRequest = Readonly<{
  destination: CheckoutDestination;
  shippingMethodId?: number;
}>;

export type CheckoutGiftWrapConfig = Readonly<{
  enabled: boolean;
  fee: number;
  currency: string;
}>;

export type CheckoutBuyer =
  | Readonly<{ kind: "authenticated" }>
  | Readonly<{
      kind: "guest";
      name: string;
      email: string;
      phone: string;
    }>;

export type CheckoutPlaceRequest = Readonly<{
  destination: CheckoutDestination;
  shippingMethodId: number;
  buyer: CheckoutBuyer;
}>;

export type CheckoutVerifyRequest = Readonly<{
  orderNumber: string;
  email: string;
  otp: string;
}>;

export type CheckoutShippingOption = Readonly<{
  id: number;
  code: string;
  name: string;
  etaLabel: string;
  price: string;
  fee: string;
  isFree: boolean;
}>;

export type CheckoutQuoteWarehouse = Readonly<{
  id: number;
  name: string;
}>;

export type CheckoutQuoteLocation = Readonly<{
  inCoverage: boolean;
  city: Readonly<{
    id: number;
    name: string;
  }>;
}>;

export type CheckoutQuoteTotalsLine = Readonly<{
  unitRegularPrice: string;
  unitPrice: string;
  discountPerUnit: string;
  quantity: number;
  lineSubtotal: string;
  personalizationFee: string;
  lineTotal: string;
  discountActive: boolean;
}>;

export type CheckoutQuoteTotals = Readonly<{
  lines: readonly CheckoutQuoteTotalsLine[];
  itemsCount: number;
  linesCount: number;
  subtotal: string;
  productDiscountTotal: string;
  personalizationTotal: string;
  couponDiscount: string;
  giftWrapFee: string;
  shippingFee: string | null;
  freeShipping: Readonly<{
    enabled: boolean;
    threshold: string | null;
    qualifies: boolean;
    remaining: string | null;
  }>;
  total: string;
  vat: Readonly<{
    rate: string;
    amount: string;
  }>;
  currency: string;
}>;

export type CheckoutQuoteCoupon = Readonly<{
  code: string;
  valid: boolean;
  reason: string | null;
}>;

export type CheckoutUnavailableLine = Readonly<{
  cartItemId: number;
  productName: Readonly<{
    ar: string;
    en: string;
  }>;
  requested: number;
  available: number;
  variantTotalRequested: number;
}>;

export type CheckoutQuote = Readonly<{
  totals: CheckoutQuoteTotals;
  shippingOptions: readonly CheckoutShippingOption[];
  fulfillable: boolean;
  warehouse: CheckoutQuoteWarehouse | null;
  unavailableLines: readonly CheckoutUnavailableLine[];
  coupon: CheckoutQuoteCoupon | null;
  location: CheckoutQuoteLocation;
}>;

export type CheckoutPlacedMoney = Readonly<{
  subtotal: string;
  discountTotal: string;
  shippingFee: string;
  personalizationTotal: string;
  giftWrapFee: string;
  taxableAmount: string;
  vat: Readonly<{ rate: string; amount: string }>;
  total: string;
  currency: string;
}>;

export type CheckoutPlacedShippingAddress = Readonly<{
  recipientName: string;
  recipientPhone: string;
  city: Readonly<{ id: number; name: string }> | null;
  district: string;
  streetDetails: string;
}>;

type CheckoutPlacedOrder = Readonly<{
  id: number;
  orderNumber: string;
  displayNumber: string;
  placedAt: string;
  shippingAddress: CheckoutPlacedShippingAddress;
  money: CheckoutPlacedMoney;
}>;

export type CheckoutPlaceResult =
  | (CheckoutPlacedOrder & Readonly<{ kind: "confirmed" }>)
  | (CheckoutPlacedOrder &
      Readonly<{
        kind: "verification-required";
        verificationExpiresAt: string | null;
      }>);

export type CheckoutVerifyResult = Extract<
  CheckoutPlaceResult,
  { kind: "confirmed" }
>;
