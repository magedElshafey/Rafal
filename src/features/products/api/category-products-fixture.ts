import type { ListingProduct } from "@/features/products/types/product-listing.types";

const images = [
  "/images/home/heart-necklace.png",
  "/images/home/name-necklace.png",
] as const;
const subcategories = ["rings", "bracelets", "necklaces", "earrings"] as const;

export const categoryProductsFixture: readonly ListingProduct[] = Array.from(
  { length: 24 },
  (_, index) => {
    const personalizable = index % 3 === 1;
    const discounted = index % 5 === 0;
    const price = 120 + (index % 6) * 15 + (index % 2 ? 0.5 : 0);

    return {
      createdOrder: index + 1,
      id: `women-jewelry-${index + 1}`,
      slug: `silver-necklace-${index + 1}`,
      name: {
        ar: personalizable ? "سلسال فضة بالاسم" : "قلادة فضة مرصعة",
        en: personalizable
          ? "Personalized silver necklace"
          : "Studded silver necklace",
      },
      imageUrl: images[index % images.length],
      subcategory: subcategories[index % subcategories.length],
      price,
      originalPrice: discounted ? price + 30 : undefined,
      rating: 4 + (index % 5) / 5,
      salesCount: 120 - index * 3 + (index % 4) * 11,
      inStock: index % 7 !== 0,
      personalizable,
      badge: discounted
        ? "discount"
        : personalizable
          ? "personalization"
          : index % 4 === 0
            ? "new"
            : undefined,
    } satisfies ListingProduct;
  },
);
