import "server-only";

import type { AccountProfile } from "@/features/account/profile/types/account-profile.types";
import { requireUser } from "@/features/auth/server/auth-boundary";

export async function getAccountProfile(): Promise<AccountProfile> {
  const user = await requireUser("/account/profile");

  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? "",
  };
}
