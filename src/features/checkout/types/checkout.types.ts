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
  paymentMethod?: "card" | "apple_pay" | "tap";
}>;

export type CheckoutVerifyRequest = Readonly<{
  orderNumber: string;
  phone: string;
  otp: string;
  expectedPaymentMethod?: CheckoutPlaceRequest["paymentMethod"];
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
  total: string;
  currency: string;
}> & (
  | Readonly<{ taxableAmount: string; vat: Readonly<{ rate: string; amount: string }>; vatAmount?: never }>
  | Readonly<{ vatAmount: string; taxableAmount?: never; vat?: never }>
);

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
  | CheckoutHostedPaymentResult
  | (CheckoutPlacedOrder & Readonly<{ kind: "confirmed" }>)
  | (CheckoutPlacedOrder &
      Readonly<{
        kind: "verification-required";
        paymentMethod?: CheckoutPlaceRequest["paymentMethod"];
        verificationExpiresAt: string | null;
      }>);

export type CheckoutHostedPaymentResult = Readonly<{
  kind: "hosted-payment-required";
  orderNumber: string;
  displayNumber: string;
  handoff: Readonly<{ paymentUrl: string; chargeId: string; expiresAt: string }>;
}>;

export type CheckoutVerifyResult = CheckoutHostedPaymentResult | Extract<
  CheckoutPlaceResult,
  { kind: "confirmed" }
>;

export type CheckoutPaymentMethod = Readonly<{ code: string; label: string; icon: string }>;

export type CheckoutPaymentDiscovery =
  | Readonly<{ kind: "ready"; methods: readonly CheckoutPaymentMethod[] }>
  | Readonly<{ kind: "unavailable" }>;

export type CheckoutPaymentOutcomeContext = Readonly<{
  order: Readonly<{ id: number; orderNumber: string; displayNumber: string; status: string; placedAt: string }>;
  payment: Readonly<{ method: string; status: string; paidAt: string | null }> | null;
  verification: Readonly<{
    required: boolean | null;
    metadataRequired: boolean | null;
    expiresAt: string | null;
  }>;
  money: Omit<CheckoutPlacedMoney, "taxableAmount" | "vat" | "vatAmount"> & (
    | Readonly<{ format: "nested-vat"; taxableAmount: string; vat: { rate: string; amount: string } }>
    | Readonly<{ format: "vat-amount"; vatAmount: string }>
  );
}>;

// Contract classification only: this is deliberately not the browser Place result.
export type CheckoutPaymentOutcome = CheckoutPaymentOutcomeContext & (
  | Readonly<{ kind: "verification-required"; nextAction: "verify-otp" }>
  | Readonly<{ kind: "paid"; nextAction: "confirm" }>
  | Readonly<{
      kind: "hosted-payment-pending";
      nextAction: "hosted-payment";
      handoff: Readonly<{ paymentUrl: string; chargeId: string; expiresAt: string }>;
    }>
  | Readonly<{ kind: "unresolved"; nextAction: "none"; reason: "unsuccessful" | "contradictory" | "missing-payment" | "unsupported" | "missing-handoff" }>
);
