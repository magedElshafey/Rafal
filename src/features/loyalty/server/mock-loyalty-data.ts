import "server-only";

import type { LoyaltyOverview } from "@/features/loyalty/types/loyalty.types";

type MockLoyaltyRecord = {
  customerId: string;
  overview: LoyaltyOverview;
};

// Phase-2 earning, redemption, expiration, tier, reversal, Checkout, and Admin
// contracts remain backend-owned. These are deterministic presentation
// fixtures, not results from a Loyalty rules engine.
export const mockLoyaltyRecords: readonly MockLoyaltyRecord[] = [
  {
    customerId: "mock-customer-01",
    overview: {
      account: {
        pointsBalance: 250,
      },
      transactions: [
        {
          id: "loyalty-transaction-10482",
          type: "earned",
          points: 45,
          occurredAt: "2026-08-18T16:20:00+03:00",
          orderReference: "RF-10482",
        },
        {
          id: "loyalty-transaction-10399",
          type: "redeemed",
          points: 100,
          occurredAt: "2026-07-29T13:10:00+03:00",
          orderReference: "RF-10399",
        },
        {
          id: "loyalty-transaction-10321",
          type: "earned",
          points: 80,
          occurredAt: "2026-07-02T11:45:00+03:00",
          orderReference: "RF-10321",
        },
        {
          id: "loyalty-transaction-10250",
          type: "earned",
          points: 60,
          occurredAt: "2026-06-25T17:05:00+03:00",
          orderReference: "RF-10250",
        },
        {
          id: "loyalty-transaction-10188",
          type: "earned",
          points: 165,
          occurredAt: "2026-06-03T09:30:00+03:00",
          orderReference: "RF-10188",
        },
      ],
    },
  },
];
