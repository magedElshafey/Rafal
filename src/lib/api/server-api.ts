import { serverEnv } from "@/config/server-env";
import { createHttpClient } from "./http-client";

export const serverApi = createHttpClient({
  baseUrl: serverEnv.apiBaseUrl,
});
