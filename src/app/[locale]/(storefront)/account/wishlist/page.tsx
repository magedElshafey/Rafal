import { getLocale, getTranslations } from "next-intl/server";

import {
  WishlistInteractiveGrid,
  type WishlistInteractiveGridCopy,
} from "@/features/wishlist/components/wishlist-interactive-grid";
import { getWishlistProducts } from "@/features/wishlist/server/wishlist-boundary";

export default async function WishlistPage() {
  const [products, locale, t] = await Promise.all([
    getWishlistProducts(),
    getLocale(),
    getTranslations("Account.wishlist"),
  ]);
  const copy: WishlistInteractiveGridCopy = {
    actions: {
      add: t("actions.add"),
      pending: t("actions.pending"),
      remove: t("actions.remove"),
    },
    badges: {
      discount: t("badges.discount"),
      new: t("badges.new"),
      personalization: t("badges.personalization"),
    },
    empty: {
      cta: t("empty.cta"),
      description: t("empty.description"),
      title: t("empty.title"),
    },
    mutationError: t("mutationError"),
    unavailable: t("unavailable"),
  };

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
      <p className="mt-3 type-body text-gray-400">{t("description")}</p>
      <div className="mt-6">
        <WishlistInteractiveGrid
          copy={copy}
          locale={locale}
          products={products}
        />
      </div>
    </div>
  );
}
