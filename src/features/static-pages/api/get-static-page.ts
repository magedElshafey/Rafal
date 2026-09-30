import "server-only";
import { cache } from "react";
import type { Locale } from "next-intl";
import { serverApi } from "@/lib/api/server-api";
import { ApiError } from "@/lib/api/api-error";
import { sanitizeHtmlToText } from "@/lib/security/sanitize-html";
import { staticPageRegistry, type StaticPageKey } from "../static-page-registry";
import type { StaticPage } from "../types";
import { parseStaticPageDto } from "./parse-static-page-dto";

// Request memoization only; metadata and page use identical primitive arguments.
export const getStaticPageForRequest = cache(async (
  pageKey: StaticPageKey,
  locale: Locale,
): Promise<StaticPage | null> => {
  const { backendSlug } = staticPageRegistry[pageKey];
  let response: unknown;
  try {
    response = await serverApi.request<unknown>({
      path: "/pages/" + encodeURIComponent(backendSlug),
      headers: { "Accept-Language": locale },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
  const dto = parseStaticPageDto(response, backendSlug);
  if (!dto.success) {
    throw new ApiError({ status: 503, code: "static-page-unavailable", message: "Page is unavailable." });
  }
  // Safe text projection for the empty state; SafeHtml owns display sanitization.
  const visibleText = sanitizeHtmlToText(dto.data.content, "static-page")
    .replace(/&nbsp;/gi, " ")
    .replace(/[\s\u200b-\u200d\u2060\ufeff]/g, "");
  return {
    id: dto.data.id, slug: dto.data.slug, title: dto.data.title,
    contentHtml: dto.data.content, hasMeaningfulContent: visibleText.length > 0,
  };
});
