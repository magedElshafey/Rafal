export type PublicSettings = {
  vatRate: number;
  freeShippingEnabled: boolean;
  freeShippingThreshold: number | null;
  giftWrapEnabled: boolean;
  giftWrapFee: number;
  maxAddressesPerUser: number;
  maxCartItemQuantity: number;
  otpResendCooldownSeconds: number;
  currency: string;
};
