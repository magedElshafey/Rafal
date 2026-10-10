import { hasLocale } from "next-intl";

import {
  getQuickAddSelectionData,
  QuickAddSelectionError,
} from "@/features/products/server/quick-add-selection-boundary";
import { routing } from "@/i18n/routing";

const headers = { "Cache-Control": "private, no-store" } as const;

function parseInput(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug")?.trim() ?? "";
  const cityIdValue = params.get("cityId") ?? "";
  if (
    !slug ||
    slug.length > 200 ||
    /[\\/\u0000-\u001f]/.test(slug) ||
    !/^[1-9]\d*$/.test(cityIdValue)
  ) {
    return null;
  }
  const cityId = Number(cityIdValue);
  return Number.isSafeInteger(cityId) ? { cityId, slug } : null;
}

export async function GET(request: Request) {
  const locale = request.headers.get("Accept-Language");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ code: "invalid-locale" }, { status: 400, headers });
  }
  const input = parseInput(request);
  if (!input) {
    return Response.json({ code: "invalid-input" }, { status: 400, headers });
  }

  try {
    return Response.json(
      await getQuickAddSelectionData({
        expectedCityId: input.cityId,
        locale,
        slug: input.slug,
      }),
      { headers },
    );
  } catch (error) {
    if (error instanceof QuickAddSelectionError) {
      const status =
        error.code === "product-unavailable"
          ? 404
          : error.code === "product-configuration-invalid"
            ? 422
          : error.code === "location-required"
            ? 428
            : 409;
      return Response.json({ code: error.code }, { status, headers });
    }
    return Response.json(
      { code: "service-unavailable" },
      { status: 503, headers },
    );
  }
}
