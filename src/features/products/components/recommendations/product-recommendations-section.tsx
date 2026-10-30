import "server-only";
import type { Locale } from "next-intl";
import { RecommendationRow } from "@/features/products/components/recommendations/recommendation-row";
import { getRelatedProducts } from "@/features/products/server/related-products-boundary";

export async function ProductRecommendationsSection({ slug, productId, locale, cityId, accountId, title }: {
  slug: string;
  productId: string;
  locale: Locale;
  cityId?: number;
  accountId: string | null;
  title: string;
}) {
  try {
    const products = await getRelatedProducts(slug, locale, cityId);
    // Exclude the current product before applying the row limit.
    return await RecommendationRow({
      products: products.filter((product) => product.id !== productId),
      locale, accountId, title,
    });
  } catch {
    // Optional discovery UI fails locally; the data boundary still throws.
    return null;
  }
}
