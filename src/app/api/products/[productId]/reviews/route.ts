import { hasLocale } from "next-intl";

import { readProductReviews } from "@/features/reviews/server/product-reviews-boundary";
import { routing } from "@/i18n/routing";

const headers = { "Cache-Control": "private, no-store" };

function positiveInteger(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const locale = request.headers.get("Accept-Language");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ code: "invalid-locale" }, { status: 400, headers });
  }
  const { productId } = await params;
  const query = new URL(request.url).searchParams;
  const page = positiveInteger(query.get("page"));
  if (
    !positiveInteger(productId) ||
    page === null ||
    query.getAll("page").length !== 1
  ) {
    return Response.json({ code: "invalid-input" }, { status: 400, headers });
  }

  // Public read only. No session lookup or credential/header forwarding.
  const result = await readProductReviews(productId, locale, {
    page,
    signal: request.signal,
    retry: false,
  });
  return result.ok
    ? Response.json(result.page, { headers })
    : Response.json({ code: "reviews-unavailable" }, { status: 503, headers });
}
