import "server-only";

import type { Locale } from "next-intl";

import { mapCategoryDto } from "@/features/categories/api/category-mapper";
import type {
  Category,
  CategoryChildDto,
  CategoryDto,
} from "@/features/categories/types";
import { mapBannerDto } from "@/features/home/api/banner-mapper";
import type { Banner, BannerDto } from "@/features/home/types";
import type { ProductDto } from "@/features/products/api/product-dto";
import { mapProductDtoToListingProduct } from "@/features/products/api/product-mappers";
import { parseProductDto } from "@/features/products/api/parse-product-dto";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { serverApi } from "@/lib/api/server-api";

type HomeLocationEntityDto = {
  id: number;
  name: string;
};

type HomeLocationDto = {
  in_coverage: boolean;
  city: HomeLocationEntityDto | null;
  region: HomeLocationEntityDto | null;
  warehouse_id: number | null;
  message: string | null;
};

type HomeDataDto = {
  location: HomeLocationDto;
  banners: readonly BannerDto[];
  categories: readonly CategoryDto[];
  new_arrivals: readonly ProductDto[];
  on_discount: readonly ProductDto[];
  personalizable: readonly ProductDto[];
  featured: readonly ProductDto[];
};

type HomeResponseDto = {
  success: boolean;
  message: string;
  data: HomeDataDto;
};

export type HomeLocationEntity = {
  id: number;
  name: string;
};

export type HomeLocation = {
  inCoverage: boolean;
  city: HomeLocationEntity | null;
  region: HomeLocationEntity | null;
  warehouseId: number | null;
  message: string | null;
};

export type HomeData = {
  location: HomeLocation;
  banners: readonly Banner[];
  categories: readonly Category[];
  newArrivals: readonly ListingProduct[];
  onDiscount: readonly ListingProduct[];
  personalizable: readonly ListingProduct[];
  featured: readonly ListingProduct[];
};

class HomeContractError extends Error {
  constructor(path: string, expected: string) {
    super(
      'Invalid Home API payload at "' + path + '": expected ' + expected + ".",
    );
    this.name = "HomeContractError";
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HomeContractError(path, "an object");
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new HomeContractError(path, "an array");
  }
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new HomeContractError(path, "a string");
  }
  return value;
}

function nonEmptyString(value: unknown, path: string): string {
  const parsed = string(value, path);
  if (parsed.trim() === "") {
    throw new HomeContractError(path, "a non-empty string");
  }
  return parsed;
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : string(value, path);
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new HomeContractError(path, "a boolean");
  }
  return value;
}

function positiveInteger(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new HomeContractError(path, "a safe positive integer");
  }
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new HomeContractError(path, "a safe non-negative integer");
  }
  return value;
}

function nullablePositiveInteger(
  value: unknown,
  path: string,
): number | null {
  return value === null ? null : positiveInteger(value, path);
}

function parseLocationEntity(
  value: unknown,
  path: string,
): HomeLocationEntityDto | null {
  if (value === null) return null;

  const source = record(value, path);
  return {
    id: positiveInteger(source.id, path + ".id"),
    name: string(source.name, path + ".name"),
  };
}

function parseBanner(value: unknown, path: string): BannerDto {
  const source = record(value, path);
  return {
    id: positiveInteger(source.id, path + ".id"),
    title: string(source.title, path + ".title"),
    image_url: nonEmptyString(source.image_url, path + ".image_url"),
    link_url: nullableString(source.link_url, path + ".link_url"),
    sort_order: nonNegativeInteger(source.sort_order, path + ".sort_order"),
  };
}

function parseCategoryChild(
  value: unknown,
  path: string,
): CategoryChildDto {
  const source = record(value, path);
  return {
    id: positiveInteger(source.id, path + ".id"),
    name: string(source.name, path + ".name"),
    slug: string(source.slug, path + ".slug"),
    description: nullableString(source.description, path + ".description"),
    image_url: nonEmptyString(source.image_url, path + ".image_url"),
    sort_order: nonNegativeInteger(source.sort_order, path + ".sort_order"),
  };
}

function parseCategory(value: unknown, path: string): CategoryDto {
  const source = record(value, path);
  return {
    ...parseCategoryChild(source, path),
    children: array(source.children, path + ".children").map((child, index) =>
      parseCategoryChild(child, path + ".children[" + index + "]"),
    ),
  };
}

function parseProducts(
  value: unknown,
  path: string,
): readonly ProductDto[] {
  return array(value, path).map((product, index) =>
    parseProductDto(product, path + "[" + index + "]"),
  );
}

function parseHomeResponse(value: unknown): HomeResponseDto {
  const response = record(value, "response");
  const data = record(response.data, "response.data");
  const location = record(data.location, "response.data.location");

  return {
    success: boolean(response.success, "response.success"),
    message: string(response.message, "response.message"),
    data: {
      location: {
        in_coverage: boolean(
          location.in_coverage,
          "response.data.location.in_coverage",
        ),
        city: parseLocationEntity(
          location.city,
          "response.data.location.city",
        ),
        region: parseLocationEntity(
          location.region,
          "response.data.location.region",
        ),
        warehouse_id: nullablePositiveInteger(
          location.warehouse_id,
          "response.data.location.warehouse_id",
        ),
        message: nullableString(
          location.message,
          "response.data.location.message",
        ),
      },
      banners: array(data.banners, "response.data.banners").map(
        (banner, index) =>
          parseBanner(banner, "response.data.banners[" + index + "]"),
      ),
      categories: array(data.categories, "response.data.categories").map(
        (category, index) =>
          parseCategory(category, "response.data.categories[" + index + "]"),
      ),
      new_arrivals: parseProducts(
        data.new_arrivals,
        "response.data.new_arrivals",
      ),
      on_discount: parseProducts(
        data.on_discount,
        "response.data.on_discount",
      ),
      personalizable: parseProducts(
        data.personalizable,
        "response.data.personalizable",
      ),
      featured: parseProducts(data.featured, "response.data.featured"),
    },
  };
}

function mapProducts(
  products: readonly ProductDto[],
): readonly ListingProduct[] {
  return products.flatMap((product) => {
    const mapped = mapProductDtoToListingProduct(product);
    return mapped ? [mapped] : [];
  });
}

export async function getHomeData(
  cityId: number | null,
  locale: Locale,
): Promise<HomeData> {
  if (cityId !== null && (!Number.isSafeInteger(cityId) || cityId <= 0)) {
    throw new TypeError("Invalid Home city ID");
  }

  const response = parseHomeResponse(
    await serverApi.request<unknown>({
      path: "/home",
      headers: { "Accept-Language": locale },
      query: cityId === null ? undefined : { city_id: cityId },
    }),
  );

  if (!response.success) {
    throw new HomeContractError("response.success", "true");
  }

  return {
    location: {
      inCoverage: response.data.location.in_coverage,
      city: response.data.location.city,
      region: response.data.location.region,
      warehouseId: response.data.location.warehouse_id,
      message: response.data.location.message,
    },
    banners: response.data.banners.map(mapBannerDto),
    categories: response.data.categories.map(mapCategoryDto),
    newArrivals: mapProducts(response.data.new_arrivals),
    onDiscount: mapProducts(response.data.on_discount),
    personalizable: mapProducts(response.data.personalizable),
    featured: mapProducts(response.data.featured),
  };
}
