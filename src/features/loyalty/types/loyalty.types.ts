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
