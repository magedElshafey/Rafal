import { getLocale } from "next-intl/server";

import { serverEnv } from "@/config/server-env";
import { createHttpClient } from "./http-client";

export const serverApi = createHttpClient({
  baseUrl: serverEnv.apiBaseUrl,

  getDefaultHeaders: async () => {
    const locale = await getLocale();

    return {
      "Accept-Language": locale,
    };
  },
});
