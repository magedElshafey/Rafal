import "server-only";
import type { Locale } from "next-intl";

import { cache } from "react";

import { getPublicSettingsFromApi } from "@/features/settings/api/public-settings-api.server";
import type { PublicSettings } from "@/features/settings/types/public-settings.types";

export const getPublicSettings = cache(
  async (locale: Locale): Promise<PublicSettings> => getPublicSettingsFromApi(locale),
);
