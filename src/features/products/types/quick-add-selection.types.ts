import type { ResolvedVariantAvailability } from "@/features/products/types/product-availability.types";
import type {
  ProductOption,
  ProductVariantPricing,
} from "@/features/products/types/product-details.types";
import type { VariantAttributes } from "@/lib/variant-attributes";

export type QuickAddSelectionVariant = {
  attributes: VariantAttributes;
  availability: ResolvedVariantAvailability;
  id: string;
  pricing: ProductVariantPricing;
};

export type QuickAddSelectionData = {
  city: {
    id: number;
    name: string;
  };
  product: {
    id: string;
    name: string;
    options: readonly ProductOption[];
    slug: string;
    variants: readonly QuickAddSelectionVariant[];
  };
};

export type QuickAddSelectionResponse =
  | { kind: "selection"; data: QuickAddSelectionData }
  | { kind: "journey-changed"; journey: "customize" | "direct" };

export type QuickAddSelectionErrorCode =
  | "invalid-input"
  | "invalid-locale"
  | "location-required"
  | "city-context-changed"
  | "product-configuration-invalid"
  | "product-unavailable"
  | "service-unavailable";
