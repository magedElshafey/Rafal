"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations, type Locale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/features/products/components/listing/product-grid";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { setWishlistState } from "@/features/wishlist/actions/set-wishlist-state";
import {
  updateWishlistMembership,
  wishlistMembershipQueryKey,
} from "@/features/wishlist/api/wishlist-membership";
import type { WishlistMembership } from "@/features/wishlist/types/wishlist.types";
import { Link } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";

export type WishlistInteractiveGridCopy = {
  actions: {
    add: string;
    pending: string;
    remove: string;
  };
  badges: Record<"discount" | "new" | "personalization", string>;
  empty: {
    cta: string;
    description: string;
    title: string;
  };
  mutationError: string;
  unavailable: string;
};

type WishlistInteractiveGridProps = {
  copy: WishlistInteractiveGridCopy;
  locale: Locale;
  products: readonly ListingProduct[];
};

type OptimisticWishlistUpdate = {
  productId: string;
  wishlisted: boolean;
};

export function WishlistInteractiveGrid({
  copy,
  locale,
  products,
}: WishlistInteractiveGridProps) {
  const t = useTranslations("Account.wishlist");
  const queryClient = useQueryClient();
  const pendingProductIdsRef = useRef(new Set<string>());
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [pendingProductIds, setPendingProductIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [, startTransition] = useTransition();
  const [optimisticProducts, updateOptimisticProducts] = useOptimistic(
    products,
    (
      currentProducts: readonly ListingProduct[],
      update: OptimisticWishlistUpdate,
    ) =>
      update.wishlisted
        ? currentProducts
        : currentProducts.filter(
            (product) => product.id !== update.productId,
          ),
  );

  const setPending = (productId: string, pending: boolean) => {
    if (pending) pendingProductIdsRef.current.add(productId);
    else pendingProductIdsRef.current.delete(productId);
    setPendingProductIds(new Set(pendingProductIdsRef.current));
  };

  const updateWishlist = (productId: string, wishlisted: boolean) => {
    if (pendingProductIdsRef.current.has(productId)) return;

    setPending(productId, true);
    startTransition(async () => {
      updateOptimisticProducts({ productId, wishlisted });
      const membership = queryClient.getQueryData<WishlistMembership>(
        wishlistMembershipQueryKey,
      );
      const previousWishlisted =
        membership?.productIds.includes(productId) ?? true;

      if (membership?.authenticated) {
        queryClient.setQueryData(
          wishlistMembershipQueryKey,
          updateWishlistMembership(membership, productId, wishlisted),
        );
      }

      const rollbackMembership = () => {
        const currentMembership = queryClient.getQueryData<WishlistMembership>(
          wishlistMembershipQueryKey,
        );
        if (currentMembership?.authenticated) {
          queryClient.setQueryData(
            wishlistMembershipQueryKey,
            updateWishlistMembership(
              currentMembership,
              productId,
              previousWishlisted,
            ),
          );
        }
      };

      try {
        // Temporary mock-storage constraint: cookie-backed read-modify-write
        // operations are serialized to avoid lost updates while each product
        // still receives an immediate, independent optimistic UI. Review this
        // queue when Laravel provides atomic Wishlist persistence.
        const mutation = mutationQueueRef.current.then(
          () => setWishlistState({ locale, productId, wishlisted }),
          () => setWishlistState({ locale, productId, wishlisted }),
        );
        mutationQueueRef.current = mutation.then(
          () => undefined,
          () => undefined,
        );
        const result = await mutation;
        if (!result.ok) {
          rollbackMembership();
          rafalToast.error(copy.mutationError);
        }
      } catch {
        rollbackMembership();
        rafalToast.error(copy.mutationError);
      } finally {
        setPending(productId, false);
      }
    });
  };

  if (optimisticProducts.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <div role="status">
          <h2 className="text-h4 font-medium text-gray-1000">
            {copy.empty.title}
          </h2>
          <p className="mt-2 type-body text-gray-600">
            {copy.empty.description}
          </p>
        </div>
        <div className="mt-5 flex justify-center">
          <Link href="/categories" className={buttonVariants()}>
            {copy.empty.cta}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <ProductGrid
      badgeLabels={copy.badges}
      getWishlistAction={(product) => {
        const pending = pendingProductIds.has(product.id);

        return {
          "aria-busy": pending || undefined,
          "aria-pressed": true,
          disabled: pending,
          label: pending ? copy.actions.pending : copy.actions.remove,
          onClick: () => updateWishlist(product.id, false),
        };
      }}
      locale={locale}
      products={optimisticProducts}
      ratingLabel={(value) => t("rating", { value })}
      unavailableLabel={copy.unavailable}
    />
  );
}
