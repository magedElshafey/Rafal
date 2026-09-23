"use client";

import type { Locale } from "next-intl";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { RafalModal } from "@/components/ui/rafal-modal";
import type { CartSnapshot } from "@/features/cart/types/cart.types";
import { formatProductMessage } from "@/features/products/utils/format-product-message";

export type ProductPurchaseSuccessCopy = {
  checkout: string;
  close: string;
  continueShopping: string;
  countTemplate: string;
  title: string;
  totalLabel: string;
};

type ProductPurchaseSuccessSheetProps = {
  cart: CartSnapshot | undefined;
  copy: ProductPurchaseSuccessCopy;
  locale: Locale;
  onCheckout: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
};

export function ProductPurchaseSuccessSheet({
  cart,
  copy,
  locale,
  onCheckout,
  onOpenChange,
  open,
  returnFocusRef,
}: ProductPurchaseSuccessSheetProps) {
  if (!cart) return null;

  const count = new Intl.NumberFormat(locale).format(
    cart.summary.totalQuantity,
  );
  const total = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cart.summary.total.currency,
  }).format(Number(cart.summary.total.amount));

  return (
    <RafalModal
      open={open}
      onOpenChange={onOpenChange}
      closeLabel={copy.close}
      showClose
      returnFocusRef={returnFocusRef}
      className="sm:max-w-md"
      variant="bottom-sheet"
      title={
        <span className="flex items-center gap-3 pe-8">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckIcon aria-hidden="true" className="size-5" />
          </span>
          <span>{copy.title}</span>
        </span>
      }
      description={formatProductMessage(copy.countTemplate, { count })}
      footer={
        <>
          <Button className="w-full sm:flex-1" onClick={onCheckout}>
            {copy.checkout}
          </Button>
          <Button
            className="w-full sm:flex-1"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {copy.continueShopping}
          </Button>
        </>
      }
    >
      <div className="mt-5 flex items-center justify-between gap-4 rounded-md bg-gray-50 px-4 py-3">
        <span className="type-body text-gray-600">{copy.totalLabel}</span>
        <strong className="type-body-lg text-gray-1000">
          <bdi>{total}</bdi>
        </strong>
      </div>
    </RafalModal>
  );
}
