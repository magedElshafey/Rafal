import "server-only";

import type { Locale } from "next-intl";
import { parseAboutUsDto } from "@/features/about/api/parse-about-us-dto";
import { mapAboutUsDto } from "@/features/about/api/about-us-mappers";
import { serverApi } from "@/lib/api/server-api";
import { ApiError } from "@/lib/api/api-error";

export async function getAboutUsData(locale: Locale) {
  const response = await serverApi.request<unknown>({
    path: "/about-us",
    headers: { "Accept-Language": locale },
  });
  const dto = parseAboutUsDto(response);
  if (!dto.success) throw new ApiError({ status: 503, code: "about-us-unavailable", message: "About Us is unavailable." });
  return mapAboutUsDto(dto, locale);
}
