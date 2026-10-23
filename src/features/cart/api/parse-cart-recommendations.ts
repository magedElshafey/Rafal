import { CartContractError } from "@/features/cart/api/parse-cart-dto";
import type { ProductDto } from "@/features/products/api/product-dto";
import { parseProductDto } from "@/features/products/api/parse-product-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export type CartRecommendationsResponseDto = {
  success: boolean;
  message: string;
  data: {
    frequently_ordered_with: readonly ProductDto[];
    related: readonly ProductDto[];
  };
};

const { parseRecord, parseBoolean, parseString, parseArray } = createRuntimeValidators(
  (path, expected) => new CartContractError(path, expected),
);

export function parseCartRecommendationsResponse(value: unknown): CartRecommendationsResponseDto {
  const source = parseRecord(value, "response");
  const data = parseRecord(source.data, "response.data");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: {
      frequently_ordered_with: parseArray(data.frequently_ordered_with, "response.data.frequently_ordered_with")
        .map((product, index) => parseProductDto(product, `response.data.frequently_ordered_with[${index}]`)),
      related: parseArray(data.related, "response.data.related")
        .map((product, index) => parseProductDto(product, `response.data.related[${index}]`)),
    },
  };
}
