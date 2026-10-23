import type { Locale } from "next-intl";
import { routing } from "@/i18n/routing";
import type { RequestConfig } from "./http-client";

// Used only by backend adapters, never by internal Next.js or third-party clients.
export function backendRequest<TBody>(
  locale: Locale,
  request: RequestConfig<TBody>,
): RequestConfig<TBody> {
  if (!routing.locales.includes(locale)) throw new Error("Unsupported API locale.");
  // Backend adapters accept endpoint paths, not arbitrary external destinations.
  if (
    request.path !== request.path.trim() ||
    /^[a-z][a-z\d+.-]*:/i.test(request.path.replace(/^\/+/, "")) ||
    request.path.startsWith("//") || request.path.includes("\\")
  ) {
    throw new Error("Backend requests require a relative endpoint path.");
  }
  const headers = new Headers(request.headers);
  headers.set("Accept-Language", locale);
  headers.set("X-Locale", locale);
  return { ...request, headers };
}
