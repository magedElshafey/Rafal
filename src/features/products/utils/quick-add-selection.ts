import type { CartSnapshot } from "@/features/cart/types/cart.types";
import type { ResolvedVariantAvailability } from "@/features/products/types/product-availability.types";
import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductDetails } from "@/features/products/types/product-details.types";
import type { QuickAddSelectionData } from "@/features/products/types/quick-add-selection.types";

export function quickAddSelectionQueryKey(
  locale: string,
  slug: string,
  committedCityId: number,
) {
  return ["product", "quick-add", locale, slug, committedCityId] as const;
}

export function quickAddCityContextMatches(
  loadedCityId: number | null,
  committedCityId: number | null,
) {
  return loadedCityId !== null && loadedCityId === committedCityId;
}

export function getQuickAddFailureRefreshTargets(
  code: string,
): { canonicalCart: boolean; selection: boolean } {
  const selection =
    code === "out-of-stock" ||
    code === "unavailable-at-location" ||
    code === "quantity-limit-exceeded" ||
    code === "variant-invalid";
  return {
    canonicalCart: code === "quantity-limit-exceeded",
    selection,
  };
}

export function getQuickAddRemainingQuantity(
  maxOrderQuantity: number,
  cart: CartSnapshot | undefined,
  variantId: string,
): number | null {
  if (!cart) return null;
  const held = cart.lines.reduce(
    (quantity, line) =>
      line.variant.id === variantId ? quantity + line.quantity : quantity,
    0,
  );
  return Math.max(0, maxOrderQuantity - held);
}

export function canSubmitQuickAddSelection({
  availability,
  cityContextMatches,
  cityTransitionLocked,
  mutationLocked,
  quantity,
  remainingAddable,
  variantId,
}: {
  availability: ResolvedVariantAvailability | null;
  cityContextMatches: boolean;
  cityTransitionLocked: boolean;
  mutationLocked: boolean;
  quantity: number;
  remainingAddable: number | null;
  variantId: string | null;
}) {
  return (
    variantId !== null &&
    availability?.status === "available" &&
    remainingAddable !== null &&
    remainingAddable > 0 &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= remainingAddable &&
    !cityTransitionLocked &&
    cityContextMatches &&
    !mutationLocked
  );
}

export function assertExpectedQuickAddCity(
  expectedCityId: number,
  durableCityId: number | null,
): "ok" | "location-required" | "city-context-changed" {
  if (durableCityId === null) return "location-required";
  return durableCityId === expectedCityId ? "ok" : "city-context-changed";
}

export function getRevalidatedQuickAddJourney(
  personalizable: boolean,
  variantCount: number,
): "selection" | "customize" | "direct" | "unavailable" {
  if (personalizable) return "customize";
  if (variantCount === 0) return "unavailable";
  return variantCount === 1 ? "direct" : "selection";
}

export function projectQuickAddSelectionData(
  product: Pick<ProductDetails, "id" | "name" | "options" | "slug" | "variants">,
  city: { id: number; name: string },
  availabilityByVariantId: VariantAvailabilityById,
): QuickAddSelectionData {
  return {
    city: { id: city.id, name: city.name },
    product: {
      id: product.id,
      name: product.name,
      options: product.options,
      slug: product.slug,
      variants: product.variants.map((variant) => ({
        attributes: variant.attributes,
        availability: availabilityByVariantId[variant.id] ?? {
          status: "purchase_unavailable",
        },
        id: variant.id,
        pricing: variant.pricing,
      })),
    },
  };
}
