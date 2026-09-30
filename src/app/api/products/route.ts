import { hasLocale } from "next-intl";

import { getProductsDto } from "@/features/products/api/product-api.server";
import type { ProductListQueryInput } from "@/features/products/api/product-api-query";
import { mapProductListResponse } from "@/features/products/api/product-mappers";
import { catalogueListingSortValues } from "@/features/products/types/product-listing.types";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const headers = { "Cache-Control": "private, no-store" };

function parseQuery(params: URLSearchParams): ProductListQueryInput {
  const positiveInteger = (key: string): number | undefined => {
    const value = params.get(key);
    if (value === null) return undefined;
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new TypeError("Invalid query");
    }
    return Number(value);
  };
  const price = (key: string): number | undefined => {
    const value = params.get(key);
    if (value === null) return undefined;
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number) || number < 0) {
      throw new TypeError("Invalid query");
    }
    return number;
  };
  const flag = (key: string): boolean | undefined => {
    const value = params.get(key);
    if (value === null) return undefined;
    if (value !== "1" && value !== "0") throw new TypeError("Invalid query");
    return value === "1";
  };
  const sortValue = params.get("sort");
  const sort = catalogueListingSortValues.find((value) => value === sortValue);
  if (sortValue !== null && sort === undefined) {
    throw new TypeError("Invalid query");
  }

  return {
    categoryId: positiveInteger("category_id"),
    cityId: positiveInteger("city_id"),
    page: positiveInteger("page"),
    perPage: positiveInteger("per_page"),
    minPrice: price("min_price"),
    maxPrice: price("max_price"),
    newArrival: flag("new_arrival"),
    onDiscount: flag("on_discount"),
    personalizable: flag("personalizable"),
    search: params.get("search") ?? undefined,
    sort,
  };
}

export async function GET(request: Request) {
  const locale = request.headers.get("Accept-Language");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ code: "invalid-locale" }, { status: 400, headers });
  }

  let query: ProductListQueryInput;
  try {
    query = parseQuery(new URL(request.url).searchParams);
  } catch {
    return Response.json({ code: "invalid-input" }, { status: 400, headers });
  }

  try {
    // Credentials are resolved by the server Product boundary, never the browser.
    const response = await getProductsDto({
      ...query,
      locale,
      signal: request.signal,
    });
    if (!response.success) {
      return Response.json(
        { code: "products-unavailable" },
        { status: 503, headers },
      );
    }
    return Response.json(mapProductListResponse(response), { headers });
  } catch (error) {
    const status =
      error instanceof ApiError && error.status >= 400 && error.status < 500
        ? error.status
        : 503;
    return Response.json({ code: "products-unavailable" }, { status, headers });
  }
}
