import "server-only";

import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";
import { mockAuthenticatedUser } from "@/features/auth/server/mock-auth-user";
import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";
import type { AccountPreferences } from "@/features/account/settings/types/account-preferences.types";

const MOCK_ACCOUNT_PREFERENCES_COOKIE_NAME =
  "rafal_mock_account_preferences";

const defaultPreferences: AccountPreferences = {
  receiveOrderUpdates: true,
  receiveOffers: true,
};

type StoredAccountPreferences = AccountPreferences & {
  customerId: string;
};

function assertMockPreferencesOwner(user: AuthenticatedUser) {
  if (
    !serverEnv.useMockApi ||
    !serverEnv.useMockAuth ||
    process.env.NODE_ENV === "production"
  ) {
    throw new Error("The mock Account Preferences store is unavailable.");
  }

  if (user.id !== mockAuthenticatedUser.id) {
    throw new Error(
      "The mock Account Preferences store supports one configured customer.",
    );
  }
}

function parseStoredPreferences(
  value: string | undefined,
): StoredAccountPreferences | null {
  if (value === undefined) return null;

  try {
    const candidate: unknown = JSON.parse(value);
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      return null;
    }

    const record = candidate as Record<string, unknown>;
    if (
      typeof record.customerId !== "string" ||
      typeof record.receiveOrderUpdates !== "boolean" ||
      typeof record.receiveOffers !== "boolean"
    ) {
      return null;
    }

    return {
      customerId: record.customerId,
      receiveOrderUpdates: record.receiveOrderUpdates,
      receiveOffers: record.receiveOffers,
    };
  } catch {
    return null;
  }
}

export async function readMockAccountPreferences(
  user: AuthenticatedUser,
): Promise<AccountPreferences> {
  assertMockPreferencesOwner(user);

  const cookieStore = await cookies();
  const storedPreferences = parseStoredPreferences(
    cookieStore.get(MOCK_ACCOUNT_PREFERENCES_COOKIE_NAME)?.value,
  );

  if (!storedPreferences || storedPreferences.customerId !== user.id) {
    return { ...defaultPreferences };
  }

  return {
    receiveOrderUpdates: storedPreferences.receiveOrderUpdates,
    receiveOffers: storedPreferences.receiveOffers,
  };
}

export async function writeMockAccountPreferences(
  user: AuthenticatedUser,
  preferences: AccountPreferences,
): Promise<void> {
  assertMockPreferencesOwner(user);

  const storedPreferences: StoredAccountPreferences = {
    customerId: user.id,
    receiveOrderUpdates: preferences.receiveOrderUpdates,
    receiveOffers: preferences.receiveOffers,
  };
  const cookieStore = await cookies();

  cookieStore.set(
    MOCK_ACCOUNT_PREFERENCES_COOKIE_NAME,
    JSON.stringify(storedPreferences),
    {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}
