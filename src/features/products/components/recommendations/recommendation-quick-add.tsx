"use client";

import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { CartSnapshot } from "@/features/cart/types/cart.types";
import { ProductQuickAddControl } from "@/features/products/components/product-card/product-quick-add-control";
import { ProductPurchaseSuccessSheet } from "@/features/products/components/product-details/product-purchase-success-sheet";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { useRouter } from "@/i18n/navigation";

export function RecommendationQuickAdd({ product, locale }: {
  product: Pick<ListingProduct, "id" | "name" | "slug" | "inStock" | "quickAdd">;
  locale: Locale;
}) {
  const t = useTranslations("Common.productDetails.purchase.success");
  const router = useRouter();
  const [cart, setCart] = useState<CartSnapshot>();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  return <>
    <ProductQuickAddControl locale={locale} productId={product.id} productName={product.name}
      slug={product.slug} quickAdd={product.quickAdd} disabled={!product.inStock || open}
      onAdded={(snapshot, trigger) => {
        triggerRef.current = trigger;
        setCart(snapshot);
        setOpen(true);
      }} />
    <ProductPurchaseSuccessSheet cart={cart} locale={locale} open={open}
      onOpenChange={setOpen} returnFocusRef={triggerRef}
      onCheckout={() => { setOpen(false); router.push("/checkout"); }}
      copy={{ checkout: t("checkout"), close: t("close"), continueShopping: t("continueShopping"),
        countTemplate: t.raw("count") as string, title: t("title"), totalLabel: t("total") }} />
  </>;
}
