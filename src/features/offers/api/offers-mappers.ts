import type { OffersDto } from "@/features/offers/api/offers-dto";
import type { Offers } from "@/features/offers/types/offers.types";
import { mapProductDtoToListingProduct } from "@/features/products/api/product-mappers";

export function mapOffersDto(dto: OffersDto): Offers {
  return {
    coupons: dto.data.coupons.map((coupon) => ({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      maxDiscountAmount: coupon.max_discount_amount,
      minOrderAmount: coupon.min_order_amount,
      endsAt: coupon.ends_at,
    })),
    discountedProducts: {
      items: dto.data.discounted_products.data.flatMap((product) => {
        const mapped = mapProductDtoToListingProduct(product);
        return mapped ? [mapped] : [];
      }),
      pagination: dto.data.discounted_products.meta,
    },
  };
}
