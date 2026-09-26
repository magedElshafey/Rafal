import { parseProductListResponse } from "@/features/products/api/parse-product-dto";
import type {
  WishlistCountResponseDto,
  WishlistMutationResponseDto,
  WishlistPageResponseDto,
} from "@/features/wishlist/api/wishlist-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class WishlistContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Wishlist API payload at "${path}": expected ${expected}.`);
    this.name = "WishlistContractError";
  }
}

const { parseBoolean, parseRecord, parseString } = createRuntimeValidators(
  (path, expected) => new WishlistContractError(path, expected),
);

function nonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new WishlistContractError(path, "a non-negative integer");
  }
  return value;
}

export function parseWishlistPageResponse(
  value: unknown,
): WishlistPageResponseDto {
  return parseProductListResponse(value);
}

export function parseWishlistMutationResponse(
  value: unknown,
): WishlistMutationResponseDto {
  const source = parseRecord(value, "response");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
  };
}

export function parseWishlistCountResponse(
  value: unknown,
): WishlistCountResponseDto {
  const source = parseRecord(value, "response");
  const data = parseRecord(source.data, "response.data");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: {
      count: nonNegativeInteger(data.count, "response.data.count"),
    },
  };
}
