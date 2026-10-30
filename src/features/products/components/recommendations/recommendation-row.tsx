import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { RecommendationQuickAdd } from "@/features/products/components/recommendations/recommendation-quick-add";
import { RecommendationRowView } from "./recommendation-row-view";

export { RecommendationRowSkeleton } from "./recommendation-row-view";

// PDP server composition. Cart uses the same view with default card actions.
export async function RecommendationRow({ products, locale, accountId, title }: {
  products: readonly ListingProduct[];
  locale: Locale;
  accountId: string | null;
  title: string;
}) {
  if (products.length === 0) return null;
  const [t, navigation] = await Promise.all([
    getTranslations({ locale, namespace: "Common.productListing" }),
    getTranslations({ locale, namespace: "Common.productDetails.discovery" }),
  ]);
  return <RecommendationRowView products={products} locale={locale} accountId={accountId} title={title}
    copy={{ previous: navigation("previous"), next: navigation("next"),
      badges: { discount: t("badges.discount"), new: t("badges.new"), personalization: t("badges.personalization") },
      rating: (value) => t("rating", { value }), reviews: (count) => t("reviews", { count }), unavailable: t("unavailable") }}
    renderQuickAdd={(product) => <RecommendationQuickAdd locale={locale} product={{ id: product.id, name: product.name,
      slug: product.slug, inStock: product.inStock, quickAdd: product.quickAdd }} />} />;
}
