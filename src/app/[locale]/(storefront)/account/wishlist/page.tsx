import { getLocale, getTranslations } from "next-intl/server";

import { requireUser } from "@/features/auth/server/auth-boundary";
import {
  WishlistInteractiveGrid,
  type WishlistInteractiveGridCopy,
} from "@/features/wishlist/components/wishlist-interactive-grid";
import { getWishlistPage } from "@/features/wishlist/server/wishlist-boundary";
import type { WishlistPage as WishlistPageData } from "@/features/wishlist/types/wishlist.types";

async function getInitialWishlistPage(
  locale: Awaited<ReturnType<typeof getLocale>>,
): Promise<WishlistPageData | null> {
  try {
    return await getWishlistPage(locale, 1);
  } catch {
    return null;
  }
}

export default async function WishlistPage() {
  const locale = await getLocale();
  await requireUser("/account/wishlist", locale);

  const [initialPage, t] = await Promise.all([
    getInitialWishlistPage(locale),
    getTranslations("Account.wishlist"),
  ]);
  const copy: WishlistInteractiveGridCopy = {
    actions: {
      pending: t("actions.pending"),
      remove: t("actions.remove"),
      removeProduct: t.raw("actions.removeProduct") as string,
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
    error: {
      description: t("error.description"),
      retry: t("error.retry"),
      title: t("error.title"),
    },
    loadMore: t("loadMore"),
    loading: t("loading"),
    loadingMore: t("loadingMore"),
    mutationError: t("mutationError"),
    nextPageError: t("nextPageError"),
    resultCount: t.raw("resultCount") as string,
    unavailable: t("unavailable"),
  };

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
      <p className="mt-3 type-body text-gray-400">{t("description")}</p>
      <div className="mt-6">
        <WishlistInteractiveGrid
          copy={copy}
          initialPage={initialPage}
          locale={locale}
        />
      </div>
    </div>
  );
}
