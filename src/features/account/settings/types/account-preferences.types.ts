import type { Locale } from "next-intl";

export type AccountPreferences = {
  receiveOrderUpdates: boolean;
  receiveOffers: boolean;
};

export type SetAccountPreferenceInput = {
  locale: Locale;
  enabled: boolean;
};

export type AccountPreferenceMutationResult = {
  ok: boolean;
};
