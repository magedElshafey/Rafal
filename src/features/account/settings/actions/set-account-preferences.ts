"use server";

import { hasLocale, type Locale } from "next-intl";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/features/auth/server/auth-boundary";
import {
  readMockAccountPreferences,
  writeMockAccountPreferences,
} from "@/features/account/settings/server/mock-account-preferences-store";
import type {
  AccountPreferenceMutationResult,
  AccountPreferences,
  SetAccountPreferenceInput,
} from "@/features/account/settings/types/account-preferences.types";
import { routing } from "@/i18n/routing";

function getSafeActionLocale(input: unknown): Locale {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    const locale = (input as Record<string, unknown>).locale;
    if (typeof locale === "string" && hasLocale(routing.locales, locale)) {
      return locale;
    }
  }

  return routing.defaultLocale;
}

function parseInput(input: unknown): SetAccountPreferenceInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.locale !== "string" ||
    !hasLocale(routing.locales, candidate.locale) ||
    typeof candidate.enabled !== "boolean"
  ) {
    return null;
  }

  return {
    locale: candidate.locale,
    enabled: candidate.enabled,
  };
}

async function setPreference(
  input: unknown,
  preference: keyof AccountPreferences,
): Promise<AccountPreferenceMutationResult> {
  const user = await requireUser(
    "/account/settings",
    getSafeActionLocale(input),
  );
  const parsedInput = parseInput(input);
  if (!parsedInput) return { ok: false };

  try {
    const currentPreferences = await readMockAccountPreferences(user);
    await writeMockAccountPreferences(user, {
      ...currentPreferences,
      [preference]: parsedInput.enabled,
    });
    revalidatePath(`/${parsedInput.locale}/account/settings`);

    return { ok: true };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const errorMessage =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      console.error(
        `[account-settings:set-preference] Unexpected mutation failure for "${preference}": ${errorMessage}`,
      );
    }

    return { ok: false };
  }
}

export async function setOrderNotificationsPreference(
  input: unknown,
): Promise<AccountPreferenceMutationResult> {
  return setPreference(input, "receiveOrderUpdates");
}

export async function setReceiveOffersPreference(
  input: unknown,
): Promise<AccountPreferenceMutationResult> {
  return setPreference(input, "receiveOffers");
}
