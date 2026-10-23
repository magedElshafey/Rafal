import "server-only";
import type { Locale } from "next-intl";
import { RecommendationRow } from "@/features/products/components/recommendations/recommendation-row";
import { getRelatedProducts } from "@/features/products/server/related-products-boundary";

export async function ProductRecommendationsSection({ slug, productId, locale, accountId, title }: {
  slug: string;
  productId: string;
  locale: Locale;
  accountId: string | null;
  title: string;
}) {
  try {
    const products = await getRelatedProducts(slug, locale);
    // Exclude the current product before applying the mapped 2–10 row limits.
    return await RecommendationRow({
      products: products.filter((product) => product.id !== productId),
      locale, accountId, title,
    });
  } catch {
    // Optional discovery UI fails locally; the data boundary still throws.
    return null;
  }
}
