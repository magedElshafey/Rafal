import type { ProductListResponseDto } from "@/features/products/api/product-dto";

export type WishlistPageResponseDto = ProductListResponseDto;

export type WishlistMutationResponseDto = {
  success: boolean;
  message: string;
};

export type WishlistCountResponseDto = {
  success: boolean;
  message: string;
  data: {
    count: number;
  };
};
