"use server";

import type { AccountProfileInput } from "@/features/account/profile/types/account-profile.types";
import { validateAccountProfile } from "@/features/account/profile/utils/validate-account-profile";
import { requireUser } from "@/features/auth/server/auth-boundary";

export async function updateAccountProfile(profile: AccountProfileInput) {
  await requireUser("/account/profile");
  const errors = validateAccountProfile(profile);

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  // Temporary no-op mutation boundary until the authenticated profile API exists.
  return { ok: true as const };
}
