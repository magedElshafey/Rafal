// src/lib/api/client-api.ts

import { clientEnv } from "@/config/client-env";
import { createHttpClient, type RequestConfig } from "./http-client";
import { backendRequest } from "./backend-request";
import type { Locale } from "next-intl";

export function createClientApi(lang: Locale) {
  const transport = createHttpClient({
    baseUrl: clientEnv.apiBaseUrl,

  });
  return {
    request<TResponse, TBody = unknown>(request: RequestConfig<TBody>) {
      return transport.request<TResponse, TBody>(backendRequest(lang, request));
    },
  };
}
