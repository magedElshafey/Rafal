// src/lib/api/client-api.ts

import { clientEnv } from "@/config/client-env";
import { createHttpClient } from "./http-client";
import type { Locale } from "next-intl";

export function createClientApi(lang: Locale = "ar") {
  return createHttpClient({
    baseUrl: clientEnv.apiBaseUrl,

    getDefaultHeaders: () => ({
      "Accept-Language": lang,
    }),
  });
}
