import "server-only";

import type { Locale } from "next-intl";
import { cache } from "react";

import { serverEnv } from "@/config/server-env";
import { getProductBySlugDto } from "@/features/products/api/product-api.server";
import { ProductContractError } from "@/features/products/api/parse-product-dto";
import { mapProductDetailsResponse } from "@/features/products/api/product-mappers";
import type { ProductDetails } from "@/features/products/types/product-details.types";
import { ApiError } from "@/lib/api/api-error";

export type UnavailableProduct = { unavailable: true };

function unavailableProduct(slug: string, reason: string): UnavailableProduct {
  console.error("[products:contract] product unavailable", { productSlug: slug, reason });
  return { unavailable: true };
}

function isSupportedProductImage(src: string): boolean {
  if (/[\\\u0000-\u001f\u007f]/u.test(src) || src.trim() !== src) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  // Match next.config.ts's API /storage/** remote pattern. Unsupported media
  // must not reach Next Image or URL-based metadata construction.
  return url.origin === serverEnv.apiBaseUrl.origin &&
    url.pathname.startsWith("/storage/") && url.search === "" &&
    url.username === "" && url.password === "";
}

function normalizeProductMedia(product: ProductDetails): ProductDetails {
  const images = product.images.filter((image) => isSupportedProductImage(image.src));
  if (images.length === product.images.length) return product;
  console.error("[products:media] omitted unsupported images", { productId: product.id });
  const ids = new Set(images.map((image) => image.id));
  return {
    ...product,
    images,
    variants: product.variants.map((variant) => ({
      ...variant,
      imageIds: variant.imageIds.filter((id) => ids.has(id)),
    })),
  };
}

export const getProductDetailsBySlug = cache(async function getProductDetailsBySlug(
  slug: string,
  locale: Locale,
  cityId?: number,
): Promise<ProductDetails | UnavailableProduct | null> {
  try {
    const response = await getProductBySlugDto({ cityId, locale, slug });
    if (!response.success) return unavailableProduct(slug, "unsuccessful-response");
    const product = mapProductDetailsResponse(response);

    if (!product) {
      return unavailableProduct(slug, "unrepresentable-product");
    }

    return normalizeProductMedia(product);
  } catch (error) {
    if (error instanceof ProductContractError) {
      return unavailableProduct(slug, "invalid-product-contract");
    }
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
});
