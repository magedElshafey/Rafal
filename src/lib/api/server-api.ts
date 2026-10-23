import { serverEnv } from "@/config/server-env";
import type { Locale } from "next-intl";
import { backendRequest } from "./backend-request";
import { createHttpClient, type RequestConfig } from "./http-client";

const transport = createHttpClient({
  baseUrl: serverEnv.apiBaseUrl,
});

export const serverApi = {
  request<TResponse, TBody = unknown>({ locale, ...request }: RequestConfig<TBody> & { locale: Locale }) {
    return transport.request<TResponse, TBody>(backendRequest(locale, request));
  },
};
