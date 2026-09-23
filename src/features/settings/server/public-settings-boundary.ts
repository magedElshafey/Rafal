import "server-only";

import { cache } from "react";

import { serverEnv } from "@/config/server-env";
import { getPublicSettingsFromApi } from "@/features/settings/api/public-settings-api.server";
import type { PublicSettings } from "@/features/settings/types/public-settings.types";

const MOCK_PUBLIC_SETTINGS: PublicSettings = {
  vatRate: 15,
  freeShippingEnabled: true,
  freeShippingThreshold: 200,
  giftWrapEnabled: true,
  giftWrapFee: 15,
  maxAddressesPerUser: 10,
  maxCartItemQuantity: 10,
  otpResendCooldownSeconds: 60,
  currency: "SAR",
};

export const getPublicSettings = cache(async (): Promise<PublicSettings> =>
  serverEnv.useMockApi ? MOCK_PUBLIC_SETTINGS : getPublicSettingsFromApi(),
);
