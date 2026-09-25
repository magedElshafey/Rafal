import type {
  ProductAttributeValue,
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

type ProductImageMapping = {
  images: readonly ProductImage[];
  imageIdsByVariantId: Readonly<Record<string, readonly string[]>>;
};

function attributeValueId(value: ProductAttributeValue): string {
  return `${typeof value}:${String(value)}`;
}

function deriveOptions(variants: readonly ProductVariantDto[]): ProductOption[] {
  const valuesByKey = new Map<string, Map<string, ProductAttributeValue>>();

  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.attributes)) {
      const values = valuesByKey.get(key) ?? new Map();
      values.set(attributeValueId(value), value);
      valuesByKey.set(key, values);
    }
  }

  return Array.from(valuesByKey, ([key, values]) => ({
    id: key,
    key,
    name: key,
    values: Array.from(values, ([id, value]) => ({
      id,
      label: String(value),
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
    inStock: isVariantInStock(variant),
    optionValues: Object.entries(variant.attributes).map(([key, value]) => ({
      optionId: key,
      valueId: attributeValueId(value),
    })),
    pricing: mapVariantPrice(
      variant,
      product.discount_percentage,
      product.discount_end_at,
    ),
    imageIds,
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
  if (productImage) return productImage.url;

  for (const variant of product.variants) {
    const variantImage = variant.images[0];
    if (variantImage) return variantImage.url;
  }

  return null;
}

function mapProductImages(product: ProductDto): ProductImageMapping | null {
  const imagesById = new Map<string, ProductImage>();
  const addImage = (image: ProductDto["images"][number]) => {
    const id = String(image.id);
    if (!imagesById.has(id)) {
      imagesById.set(id, { id, src: image.url, alt: product.name });
    }
    return id;
  };

  for (const image of product.images) addImage(image);

  const imageIdsByVariantId = Object.fromEntries(
    product.variants.map((variant) => [
      String(variant.id),
      Array.from(new Set(variant.images.map(addImage))),
    ]),
  );

  if (imagesById.size === 0) return null;

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
    categoryId: product.category.id,
    id: String(product.id),
    imageUrl,
    inStock: product.variants.some(isVariantInStock),
    name: product.name,
    originalPrice: price.original ?? undefined,
    personalizable: product.is_personalizable,
    price: price.current,
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
  if (!product.category || product.variants.length === 0) return null;

  const personalization = mapPersonalization(product);
  const mappedImages = mapProductImages(product);
  if (!personalization || !mappedImages) return null;

  return {
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    description: { html: product.description ?? "" },
    category: {
      id: String(product.category.id),
      name: product.category.name,
      slug: product.category.slug,
    },
    images: mappedImages.images,
    options: deriveOptions(product.variants),
    variants: product.variants.map((variant) =>
      mapVariant(
        variant,
        product,
        mappedImages.imageIdsByVariantId[String(variant.id)] ?? [],
      ),
    ),
    ratingSummary: null,
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
