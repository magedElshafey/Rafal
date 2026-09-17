import type { ResolvedVariantAvailability } from "@/features/products/types/product-availability.types";
import type {
  ProductImage,
  ProductPersonalizationInput,
} from "@/features/products/types/product-details.types";
import type { ProductPersonalizationValidationError } from "@/features/products/utils/validate-product-personalization";
import type { Money } from "@/types/money.types";

export type AddCartLineInput = {
  productId: string;
  variantId: string;
  quantity: number;
  personalization?: ProductPersonalizationInput;
};

export type CartSelectedOption = {
  optionId: string;
  optionName: string;
  valueId: string;
  valueLabel: string;
};

export type CartLine = {
  id: string;
  product: {
    id: string;
    slug: string;
    name: string;
    image: ProductImage;
  };
  variant: {
    id: string;
    sku: string;
    selectedOptions: readonly CartSelectedOption[];
  };
  personalization: ProductPersonalizationInput | null;
  quantity: number;
  availability: ResolvedVariantAvailability;
  unitPrice: Money;
  personalizationFee: Money | null;
  lineTotal: Money;
};

export type CartSummary = {
  lineCount: number;
  totalQuantity: number;
  subtotal: Money;
  personalizationFees: Money;
  total: Money;
};

export type CartSnapshot = {
  lines: readonly CartLine[];
  summary: CartSummary;
};

export type AddCartLineError =
  | { code: "invalid-input" }
  | { code: "product-unavailable" }
  | { code: "variant-invalid" }
  | { code: "location-required" }
  | { code: "unavailable-at-location" }
  | { code: "out-of-stock" }
  | { code: "quantity-limit-exceeded"; maxOrderQuantity: number }
  | {
      code: "invalid-personalization";
      reason: ProductPersonalizationValidationError["code"];
    }
  | { code: "cart-session-failure" }
  | { code: "service-unavailable" };

export type AddCartLineResult =
  | {
      ok: true;
      cart: CartSnapshot;
      affectedLineId: string;
    }
  | { ok: false; error: AddCartLineError };
