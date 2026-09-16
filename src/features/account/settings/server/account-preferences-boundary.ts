import "server-only";

import { requireUser } from "@/features/auth/server/auth-boundary";
import { readMockAccountPreferences } from "@/features/account/settings/server/mock-account-preferences-store";
import type { AccountPreferences } from "@/features/account/settings/types/account-preferences.types";

export async function getAccountPreferences(): Promise<AccountPreferences> {
  const user = await requireUser("/account/settings");
  return readMockAccountPreferences(user);
}
