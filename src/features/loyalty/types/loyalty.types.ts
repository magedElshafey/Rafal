export type LoyaltyTransactionType = "earned" | "redeemed";

export type LoyaltyAccount = {
  pointsBalance: number;
};

export type LoyaltyTransaction = {
  id: string;
  type: LoyaltyTransactionType;
  points: number;
  occurredAt: string;
  orderReference: string;
};

export type LoyaltyOverview = {
  account: LoyaltyAccount;
  transactions: readonly LoyaltyTransaction[];
};

export type LoyaltySummary = {
  available: number;
  valueSar: string;
  pending: number;
  pendingAvailableOn: string | null;
  expiringSoon: { points: number; expiresAt: string } | null;
  isNegative: boolean;
  isPaused: boolean;
  howItWorks: {
    amountPerPoint: string;
    redeemPoints: number;
    redeemAmount: string;
    maxRedeemPercent: number;
    minRedeemPoints: number;
    returnWindowDays: number;
    validityMonths: number | null | undefined;
  };
};
