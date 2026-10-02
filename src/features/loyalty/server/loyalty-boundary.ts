import "server-only";

import { requireUser } from "@/features/auth/server/auth-boundary";
import { mockLoyaltyRecords } from "@/features/loyalty/server/mock-loyalty-data";
import type {
  LoyaltyAccount,
  LoyaltyOverview,
} from "@/features/loyalty/types/loyalty.types";

async function getAuthenticatedLoyaltyOverview(
  returnTo: string,
): Promise<LoyaltyOverview | null> {
  const user = await requireUser(returnTo);

  const record = mockLoyaltyRecords.find(
    (candidate) => candidate.customerId === user.id,
  );
  return record?.overview ?? null;
}

export async function getLoyaltyAccount(): Promise<LoyaltyAccount> {
  const overview = await getAuthenticatedLoyaltyOverview("/account/profile");
  if (!overview) {
    return {
      pointsBalance: 0,
    };
  }

  return { ...overview.account };
}

export async function getLoyaltyOverview(): Promise<LoyaltyOverview> {
  const overview = await getAuthenticatedLoyaltyOverview("/account/loyalty");
  if (!overview) {
    return {
      account: {
        pointsBalance: 0,
      },
      transactions: [],
    };
  }

  return {
    account: {
      ...overview.account,
    },
    transactions: [...overview.transactions].sort(
      (first, second) =>
        Date.parse(second.occurredAt) - Date.parse(first.occurredAt),
    ),
  };
}
