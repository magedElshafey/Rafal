"use client";

import type { MouseEventHandler } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

type ProductStickyPurchaseActionsProps = {
  addToCartLabel: string;
  addingLabel: string;
  canAddToCart: boolean;
  errorMessage: string | null;
  formattedPrice: string;
  isPending: boolean;
  isVisible: boolean;
  mobileLabel: string;
  desktopLabel: string;
  onAddToCart: MouseEventHandler<HTMLButtonElement>;
  productName: string;
};

export function ProductStickyPurchaseActions({
  addToCartLabel,
  addingLabel,
  canAddToCart,
  desktopLabel,
  errorMessage,
  formattedPrice,
  isPending,
  isVisible,
  mobileLabel,
  onAddToCart,
  productName,
}: ProductStickyPurchaseActionsProps) {
  const visibilityClassName = isVisible
    ? "translate-y-0 opacity-100"
    : "pointer-events-none translate-y-full opacity-0";

  return (
    <>
      <aside
        aria-label={mobileLabel}
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={cn(
          "fixed inset-x-0 z-30 border-t border-gray-200 bg-gray-0 px-4 py-3 shadow-[var(--shadow-modal)] transition-[transform,opacity] motion-reduce:transition-none md:hidden",
          "bottom-[calc(var(--mobile-bottom-navigation-height)+env(safe-area-inset-bottom))]",
          visibilityClassName,
        )}
      >
        {errorMessage ? (
          <p
            id="mobile-sticky-cart-error"
            className="mb-2 type-caption text-destructive"
          >
            {errorMessage}
          </p>
        ) : null}
        <div className="flex min-w-0 items-center gap-3">
          <strong className="min-w-0 flex-1 truncate type-body-lg text-gray-1000">
            <bdi>{formattedPrice}</bdi>
          </strong>
          <Button
            className="min-w-36"
            disabled={!canAddToCart || isPending}
            loading={isPending}
            loadingLabel={addingLabel}
            aria-describedby={
              errorMessage ? "mobile-sticky-cart-error" : undefined
            }
            onClick={onAddToCart}
          >
            {addToCartLabel}
          </Button>
        </div>
      </aside>

      <aside
        aria-label={desktopLabel}
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={cn(
          "fixed inset-x-0 top-0 z-30 hidden border-b border-gray-200 bg-gray-0 py-3 shadow-[var(--shadow-modal)] transition-[transform,opacity] motion-reduce:transition-none md:block",
          isVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <Container className="flex items-center gap-5 lg:px-[3.75rem]">
          <div className="min-w-0 flex-1">
            <p className="truncate type-body font-medium text-gray-900">
              {productName}
            </p>
            {errorMessage ? (
              <p
                id="desktop-sticky-cart-error"
                className="mt-0.5 truncate type-caption text-destructive"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>
          <strong className="shrink-0 type-body-lg text-gray-1000">
            <bdi>{formattedPrice}</bdi>
          </strong>
          <Button
            className="min-w-40"
            disabled={!canAddToCart || isPending}
            loading={isPending}
            loadingLabel={addingLabel}
            aria-describedby={
              errorMessage ? "desktop-sticky-cart-error" : undefined
            }
            onClick={onAddToCart}
          >
            {addToCartLabel}
          </Button>
        </Container>
      </aside>
    </>
  );
}
