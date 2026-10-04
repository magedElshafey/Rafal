import type {
  ProductCategoryDto,
  ProductDetailsResponseDto,
  ProductDto,
  ProductImageDto,
  ProductListMetaDto,
  ProductListResponseDto,
  ProductVariantDto,
  ProductWarehouseStockDto,
} from "@/features/products/api/product-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";
import { parseVariantAttributes } from "@/lib/variant-attributes";
export class ProductContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Product API payload at "${path}": expected ${expected}.`);
    this.name = "ProductContractError";
  }
}
const {
  parseArray,
  parseBoolean,
  parseFiniteNumber,
  parseNonEmptyString,
  parseNullableNumber,
  parseNullableString,
  parseRecord,
  parseString,
} = createRuntimeValidators(
  (path, expected) => new ProductContractError(path, expected),
);

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ProductContractError(path, "a positive integer");
  }
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ProductContractError(path, "a non-negative integer");
  }
  return value;
}

function nullablePositiveInteger(value: unknown, path: string): number | null {
  return value === null ? null : positiveInteger(value, path);
}

function decimalString(value: unknown, path: string): string {
  const parsed = parseString(value, path);
  const numeric = Number(parsed);
  if (parsed.trim() === "" || !Number.isFinite(numeric) || numeric < 0) {
    throw new ProductContractError(path, "a non-negative decimal string");
  }
  return parsed;
}

function nullableDecimalString(value: unknown, path: string): string | null {
  return value === null || value === undefined
    ? null
    : decimalString(value, path);
}

function parseWarehouseStock(
  value: unknown,
  path: string,
): ProductWarehouseStockDto {
  const source = parseRecord(value, path);
  return {
    warehouse_id: positiveInteger(source.warehouse_id, `${path}.warehouse_id`),
    quantity: nonNegativeInteger(source.quantity, `${path}.quantity`),
  };
}

function parseImage(value: unknown, path: string): ProductImageDto {
  return parseNonEmptyString(value, path);
}

function parseVariant(value: unknown, path: string): ProductVariantDto {
  const source = parseRecord(value, path);
  return {
    id: positiveInteger(source.id, `${path}.id`),
    sku: parseNonEmptyString(source.sku, `${path}.sku`),
    attributes: parseVariantAttributes(source.attributes, `${path}.attributes`),
    effective_price: decimalString(
      source.effective_price,
      `${path}.effective_price`,
    ),
    effective_price_incl_vat: nullableDecimalString(
      source.effective_price_incl_vat,
      `${path}.effective_price_incl_vat`,
    ),
    discounted_price: nullableDecimalString(
      source.discounted_price,
      `${path}.discounted_price`,
    ),
    discounted_price_incl_vat: nullableDecimalString(
      source.discounted_price_incl_vat,
      `${path}.discounted_price_incl_vat`,
    ),
    images: parseArray(source.images, `${path}.images`).map((image, index) =>
      parseImage(image, `${path}.images[${index}]`),
    ),
    warehouse_stocks: parseArray(
      source.warehouse_stocks ?? [],
      `${path}.warehouse_stocks`,
    ).map((stock, index) =>
      parseWarehouseStock(stock, `${path}.warehouse_stocks[${index}]`),
    ),
  };
}

function reportMalformedVariant({
  error,
  index,
  path,
  productId,
  productSlug,
  value,
}: {
  error: unknown;
  index: number;
  path: string;
  productId: number;
  productSlug: string;
  value: unknown;
}) {
  const variantId =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>).id
      : undefined;
  console.error("[products:variant-contract] excluded malformed variant", {
    productId,
    productSlug,
    variantIndex: index,
    variantId:
      typeof variantId === "number" || typeof variantId === "string"
        ? variantId
        : undefined,
    reason: error instanceof Error ? error.message : `Invalid value at ${path}`,
  });
}

function parseVariants(
  value: unknown,
  path: string,
  product: { id: number; slug: string },
): readonly ProductVariantDto[] {
  return parseArray(value, path).flatMap((variant, index) => {
    const variantPath = `${path}[${index}]`;
    try {
      return [parseVariant(variant, variantPath)];
    } catch (error) {
      reportMalformedVariant({
        error,
        index,
        path: variantPath,
        productId: product.id,
        productSlug: product.slug,
        value: variant,
      });
      return [];
    }
  });
}

function parseCategory(
  value: unknown,
  path: string,
): ProductCategoryDto | null {
  if (value === null) return null;
  const source = parseRecord(value, path);
  return {
    id: positiveInteger(source.id, `${path}.id`),
    name: parseString(source.name, `${path}.name`),
    slug: parseString(source.slug, `${path}.slug`),
  };
}

export function parseProductDto(value: unknown, path = "product"): ProductDto {
  const source = parseRecord(value, path);
  const id = positiveInteger(source.id, `${path}.id`);
  const slug = parseString(source.slug, `${path}.slug`);
  return {
    id,
    sku: parseString(source.sku, `${path}.sku`),
    name: parseString(source.name, `${path}.name`),
    description: parseNullableString(source.description, `${path}.description`),
    slug,
    base_price: decimalString(source.base_price, `${path}.base_price`),
    discount_percentage: parseNullableNumber(
      source.discount_percentage,
      `${path}.discount_percentage`,
    ),
    discount_end_at: parseNullableString(
      source.discount_end_at,
      `${path}.discount_end_at`,
    ),
    badges: parseArray(source.badges, `${path}.badges`).map((badge, index) =>
      parseString(badge, `${path}.badges[${index}]`),
    ),
    is_personalizable: parseBoolean(
      source.is_personalizable,
      `${path}.is_personalizable`,
    ),
    is_wishlist: parseBoolean(source.is_wishlist, `${path}.is_wishlist`),
    personalization_max_length: nullablePositiveInteger(
      source.personalization_max_length,
      `${path}.personalization_max_length`,
    ),
    personalization_fee: nullableDecimalString(
      source.personalization_fee,
      `${path}.personalization_fee`,
    ),
    viewers_now: nonNegativeInteger(source.viewers_now, `${path}.viewers_now`),
    times_ordered: nonNegativeInteger(
      source.times_ordered,
      `${path}.times_ordered`,
    ),
    rating_average: parseFiniteNumber(
      source.rating_average,
      `${path}.rating_average`,
    ),
    reviews_count: nonNegativeInteger(
      source.reviews_count,
      `${path}.reviews_count`,
    ),
    images: parseArray(source.images, `${path}.images`).map((image, index) =>
      parseImage(image, `${path}.images[${index}]`),
    ),
    category: parseCategory(source.category, `${path}.category`),
    variants: parseVariants(source.variants, `${path}.variants`, { id, slug }),
  };
}

function parseMeta(value: unknown, path: string): ProductListMetaDto {
  const source = parseRecord(value, path);
  return {
    current_page: positiveInteger(source.current_page, `${path}.current_page`),
    last_page: positiveInteger(source.last_page, `${path}.last_page`),
    per_page: positiveInteger(source.per_page, `${path}.per_page`),
    total: nonNegativeInteger(source.total, `${path}.total`),
  };
}

export function parseProductListResponse(
  value: unknown,
): ProductListResponseDto {
  const source = parseRecord(value, "response");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseArray(source.data, "response.data").map((product, index) =>
      parseProductDto(product, `response.data[${index}]`),
    ),
    meta: parseMeta(source.meta, "response.meta"),
  };
}

export function parseProductDetailsResponse(
  value: unknown,
): ProductDetailsResponseDto {
  const source = parseRecord(value, "response");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseProductDto(source.data, "response.data"),
  };
}
