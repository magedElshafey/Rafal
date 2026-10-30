"use client";

import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import type { CartRecommendations } from "@/features/cart/types/cart-recommendations.types";
import type { CartSnapshot } from "@/features/cart/types/cart.types";
import { RecommendationRowView, RecommendationRowSkeleton } from "@/features/products/components/recommendations/recommendation-row-view";

type RecommendationRead =
  | { status: "inactive" | "loading" | "error" }
  | { status: "success"; data: CartRecommendations };

// Presentation only until Phase 4C supplies a session-safe query owner.
// A disabled useQuery could still expose cached private data; do not mount one.
export function CartRecommendationRows({ cart, locale, accountId, read, contextReady }: {
  cart: CartSnapshot;
  locale: Locale;
  accountId: string | null;
  read: RecommendationRead;
  contextReady: boolean;
}) {
  const t = useTranslations("Common.productListing");
  const navigation = useTranslations("Common.productDetails.discovery");
  const titles = useTranslations("Common.cartPage.recommendations");
  if (!contextReady || cart.lines.length === 0 || read.status === "inactive" || read.status === "error") return null;
  const firstTitle = titles("frequentlyOrderedWith");
  const secondTitle = navigation("relatedTitle");
  if (read.status === "loading") return <>
    <RecommendationRowSkeleton title={firstTitle} loadingLabel={navigation("loading")} />
    <RecommendationRowSkeleton title={secondTitle} loadingLabel={navigation("loading")} />
  </>;
  if (read.status !== "success") return null;
  const cartIds = new Set(cart.lines.map((line) => line.product.id));
  const uniqueOutsideCart = (products: CartRecommendations["related"]) => {
    const seen = new Set(cartIds);
    return products.filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
  };
  const first = uniqueOutsideCart(read.data.frequentlyOrderedWith);
  const second = uniqueOutsideCart(read.data.related);
  const copy = { previous: navigation("previous"), next: navigation("next"),
    badges: { discount: t("badges.discount"), new: t("badges.new"), personalization: t("badges.personalization") },
    rating: (value: string) => t("rating", { value }), reviews: (count: number) => t("reviews", { count }), unavailable: t("unavailable") };
  return <>
    <RecommendationRowView products={first} locale={locale} accountId={accountId} title={firstTitle} copy={copy} />
    <RecommendationRowView products={second} locale={locale} accountId={accountId} title={secondTitle} copy={copy} />
  </>;
}
