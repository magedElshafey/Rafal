import type { AddCartLineInput } from "@/features/cart/types/cart.types";
import type { ProductDto } from "@/features/products/api/product-dto";
import type { ListingQuickAdd } from "@/features/products/types/product-listing.types";

export function deriveListingQuickAdd(
  product: Pick<ProductDto, "is_personalizable" | "variants">,
): ListingQuickAdd {
  if (product.is_personalizable) return { kind: "customize" };
  if (product.variants.length === 1) {
    return { kind: "direct", variantId: String(product.variants[0]!.id) };
  }
  return { kind: "select-options" };
}

export function getDirectQuickAddInput(
  productId: string,
  quickAdd: ListingQuickAdd,
): AddCartLineInput | null {
  return quickAdd.kind === "direct"
    ? { productId, variantId: quickAdd.variantId, quantity: 1 }
    : null;
}

export function getQuickAddActivation(
  quickAdd: ListingQuickAdd,
  committedCityId: number | null,
): "direct" | "selector" | "pdp" {
  if (quickAdd.kind === "direct") return "direct";
  if (quickAdd.kind === "select-options" && committedCityId !== null) {
    return "selector";
  }
  return "pdp";
}

export function canStartQuickAdd({
  activationLocked,
  cityTransitionLocked,
  disabled,
  pending,
}: {
  activationLocked: boolean;
  cityTransitionLocked: boolean;
  disabled: boolean;
  pending: boolean;
}) {
  return !disabled && !cityTransitionLocked && !pending && !activationLocked;
}

export function getQuickAddTriggerAccessibility(
  blocked: boolean,
  selectorOpen: boolean,
) {
  return {
    ariaDisabled: blocked,
    disabled: blocked && !selectorOpen,
  };
}
