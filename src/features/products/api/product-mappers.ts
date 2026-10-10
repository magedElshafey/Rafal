import type {
  ProductDetailsResponseDto,
  ProductDto,
  ProductListResponseDto,
  ProductVariantDto,
} from "@/features/products/api/product-dto";
import {
  getVariantPricePresentation,
  mapVariantPrice,
  selectLowestDisplayPriceVariant,
} from "@/features/products/api/product-price-projection";
import type {
  ListingProduct,
  PaginatedListingProducts,
} from "@/features/products/types/product-listing.types";
import type {
  ProductDetails,
  ProductImage,
  ProductOption,
  ProductPersonalizationConfig,
  ProductVariant,
} from "@/features/products/types/product-details.types";
import { deriveListingQuickAdd } from "@/features/products/utils/listing-quick-add";
import { getVariantAttributeEntries } from "@/lib/variant-attributes";

type ProductImageMapping = {
  images: readonly ProductImage[];
  imageIdsByVariantId: Readonly<Record<string, readonly string[]>>;
};

function deriveOptions(variants: readonly ProductVariantDto[]): ProductOption[] {
  const valuesByKey = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const [key, value] of getVariantAttributeEntries(variant.attributes)) {
      const values = valuesByKey.get(key) ?? new Set<string>();
      values.add(value);
      valuesByKey.set(key, values);
    }
  }

  return Array.from(valuesByKey, ([key, values]) => ({
    id: key,
    key,
    name: key,
    values: Array.from(values, (value) => ({
      id: value,
      label: value,
    })),
  }));
}

function mapVariant(
  variant: ProductVariantDto,
  product: ProductDto,
  imageIds: readonly string[],
): ProductVariant {
  return {
    id: String(variant.id),
    sku: variant.sku,
    attributes: variant.attributes,
    inStock: isVariantInStock(variant),
    optionValues: getVariantAttributeEntries(variant.attributes).map(
      ([key, value]) => ({ optionId: key, valueId: value }),
    ),
    pricing: mapVariantPrice(
      variant,
      product.discount_percentage,
      product.discount_end_at,
    ),
    imageIds,
    warehouseStocks: variant.warehouse_stocks.map((stock) => ({
      warehouseId: stock.warehouse_id,
      quantity: stock.quantity,
    })),
  };
}

function mapPersonalization(
  product: ProductDto,
): ProductPersonalizationConfig | null {
  if (!product.is_personalizable) return { enabled: false };
  if (
    product.personalization_max_length === null ||
    !Number.isInteger(product.personalization_max_length) ||
    product.personalization_max_length <= 0
  ) {
    return null;
  }

  return {
    enabled: true,
    maxLength: product.personalization_max_length,
    allowedLanguages: ["arabic", "english"],
    characterPolicy: "letters-and-spaces",
    additionalFee:
      product.personalization_fee === null
        ? null
        : { amount: Number(product.personalization_fee), currency: "SAR" },
  };
}

export function isVariantInStock(variant: ProductVariantDto): boolean {
  return variant.warehouse_stocks.some((stock) => stock.quantity > 0);
}

function getListingImageUrl(product: ProductDto): string | null {
  const productImage = product.images[0];
  if (productImage) return productImage;

  for (const variant of product.variants) {
    const variantImage = variant.images[0];
    if (variantImage) return variantImage;
  }

  return null;
}

function getListingSecondaryImageUrl(
  product: ProductDto,
  primaryUrl: string | null,
): string | null {
  const productImage = product.images.find((image) => image !== primaryUrl);
  if (productImage) return productImage;

  for (const variant of product.variants) {
    const variantImage = variant.images.find((image) => image !== primaryUrl);
    if (variantImage) return variantImage;
  }

  return null;
}

function mapProductImages(product: ProductDto): ProductImageMapping {
  const imagesById = new Map<string, ProductImage>();
  const canonicalIdByUrl = new Map<string, string>();
  const addImage = (url: ProductDto["images"][number]) => {
    const canonicalId = canonicalIdByUrl.get(url) ?? `url:${url}`;
    if (!canonicalIdByUrl.has(url)) {
      canonicalIdByUrl.set(url, canonicalId);
      imagesById.set(canonicalId, { id: canonicalId, src: url, alt: product.name });
    }
    return canonicalId;
  };

  for (const image of product.images) addImage(image);

  const imageIdsByVariantId = Object.fromEntries(
    product.variants.map((variant) => [
      String(variant.id),
      Array.from(new Set(variant.images.map(addImage))),
    ]),
  );

  return {
    images: Array.from(imagesById.values()),
    imageIdsByVariantId,
  };
}

export function mapProductDtoToListingProduct(
  product: ProductDto,
): ListingProduct | null {
  if (!product.category || product.variants.length === 0) return null;

  const imageUrl = getListingImageUrl(product);
  const priceVariant = selectLowestDisplayPriceVariant(product.variants);
  if (!priceVariant) return null;

  const price = getVariantPricePresentation(priceVariant);
  return {
    badges: product.badges,
    isWishlisted: product.is_wishlist,
    categoryId: product.category.id,
    id: String(product.id),
    imageUrl,
    secondaryImageUrl: getListingSecondaryImageUrl(product, imageUrl),
    inStock: product.variants.some(isVariantInStock),
    name: product.name,
    originalPrice: price.original ?? undefined,
    personalizable: product.is_personalizable,
    price: price.current,
    quickAdd: deriveListingQuickAdd(product),
    ratingAverage: product.rating_average,
    reviewsCount: product.reviews_count,
    salesCount: product.times_ordered,
    slug: product.slug,
    subcategory: product.category.slug,
  };
}

export function mapProductDtoToProductDetails(
  product: ProductDto,
): ProductDetails | null {
  if (!product.category) return null;

  const variants = product.variants;
  const personalization = mapPersonalization(product);
  const mappedImages = mapProductImages(product);
  if (!personalization) return null;

  return {
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    description: { html: product.description ?? "" },
    isWishlisted: product.is_wishlist,
    category: {
      id: String(product.category.id),
      name: product.category.name,
      slug: product.category.slug,
    },
    images: mappedImages.images,
    options: deriveOptions(variants),
    variants: variants.map((variant) =>
      mapVariant(
        variant,
        product,
        mappedImages.imageIdsByVariantId[String(variant.id)] ?? [],
      ),
    ),
    ratingSummary: {
      average: product.rating_average,
      count: product.reviews_count,
    },
    socialProof: {
      timesOrdered: product.times_ordered,
      viewersNow: product.viewers_now,
    },
    personalization,
  };
}

export function mapProductListResponse(
  response: ProductListResponseDto,
): PaginatedListingProducts {
  return {
    items: response.data.flatMap((product) => {
      const mapped = mapProductDtoToListingProduct(product);
      return mapped ? [mapped] : [];
    }),
    pagination: response.meta,
  };
}

export function mapProductDetailsResponse(
  response: ProductDetailsResponseDto,
): ProductDetails | null {
  return mapProductDtoToProductDetails(response.data);
}
