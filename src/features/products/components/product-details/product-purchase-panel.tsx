import { ProductPersonalizationFields } from "@/features/products/components/product-personalization-fields";
import type { Locale } from "next-intl";
import {
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from "react";

import { Button } from "@/components/ui/button";
import { VariantColorSwatch } from "@/components/ui/variant-attribute-value";
import {
  CheckIcon,
  EyeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
} from "@/components/ui/icons";
import { AnimatedProductMetric } from "@/features/products/components/product-details/animated-product-metric";
import { ProductPriceBlock } from "@/features/products/components/product-details/product-price-block";
import { ProductHeaderRating } from "@/features/products/components/product-details/product-header-rating";
import type {
  ResolvedVariantAvailability,
  VariantAvailabilityById,
} from "@/features/products/types/product-availability.types";
import type {
  PersonalizationLanguage,
  ProductDetails,
  ProductPersonalizationInput,
  ProductVariant,
} from "@/features/products/types/product-details.types";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import type { SelectedProductOptions } from "@/features/products/utils/product-variant-resolver";
import type {
  ProductPersonalizationValidationResult,
} from "@/features/products/utils/validate-product-personalization";
import { cn } from "@/lib/utils";
import { getVariantAttributeLabel } from "@/lib/variant-attributes";


export type ProductPurchasePanelCopy = {
  addToCart: string;
  availability: {
    availableTemplate: string;
    availableAtLocationTemplate: string;
    outOfStock: string;
    purchaseUnavailable: string;
    unavailableAtLocation: string;
    unavailableAtLocationTemplate: string;
    uncoveredLocationTemplate: string;
  };
  options: {
    colorOptionTemplate: string;
    labels: {
      color: string;
      size: string;
    };
  };
  price: {
    countdown: {
      days: string;
      expired: string;
      hours: string;
      label: string;
      minutes: string;
      seconds: string;
    };
    discountTemplate: string;
    promotion: string;
    vatInclusive: string;
  };
  quantity: {
    decrease: string;
    increase: string;
    labelTemplate: string;
    remainingHintTemplate: string;
    title: string;
  };
  ratingLabelTemplate: string;
  ratingSummaryTemplate: string;
  socialProof: {
    timesOrdered: string;
    viewersNow: string;
  };
  skuTemplate: string;
};

type ProductPurchasePanelProps = {
  cartControls?: ReactNode;
  addToCartErrorMessage: string | null;
  addingToCartLabel: string;
  availability: ResolvedVariantAvailability;
  availabilityByVariantId: VariantAvailabilityById;
  canAddToCart: boolean;
  copy: ProductPurchasePanelCopy;
  isAddingToCart: boolean;
  locale: Locale;
  locationAction: ReactNode;
  locationInCoverage: boolean | null;
  locationName: string | null;
  bnplInformation: ReactNode;
  onAddToCart: MouseEventHandler<HTMLButtonElement>;
  onChangePersonalizationText: (text: string) => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  onSelectPersonalizationLanguage: (language: PersonalizationLanguage) => void;
  onSelectOption: (optionId: string, valueId: string) => void;
  personalizationInput: ProductPersonalizationInput | null;
  personalizationResetKey: number;
  personalizationValidation: ProductPersonalizationValidationResult | null;
  product: Pick<
    ProductDetails,
    | "id"
    | "name"
    | "options"
    | "personalization"
    | "ratingSummary"
    | "socialProof"
    | "variants"
  >;
  quantity: number;
  remainingAddable: number | null;
  purchaseActionRef: Ref<HTMLDivElement>;
  renderedAt: number;
  selectedOptions: SelectedProductOptions;
  shareActions: ReactNode;
  variant: ProductVariant | null;
};

// Options are customer choices; inventory identity stays in the purchase owner.
function ProductVariants({
  availabilityByVariantId,
  copy,
  onSelectOption,
  product,
  selectedOptions,
}: {
  availabilityByVariantId: VariantAvailabilityById;
  copy: ProductPurchasePanelCopy["options"];
  onSelectOption: (optionId: string, valueId: string) => void;
  product: Pick<ProductDetails, "options" | "variants">;
  selectedOptions: SelectedProductOptions;
}) {
  if (product.options.length === 0) return null;

  return (
    <div className="space-y-4">
      {product.options.map((option) => {
        const optionLabel = getVariantAttributeLabel(option.key, copy.labels);
        const label = optionLabel.charAt(0).toUpperCase() + optionLabel.slice(1);
        return (
          <fieldset key={option.id} className="min-w-0">
            <legend className="type-body font-medium text-gray-900">
              {label}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value, index) => {
                const selectable = product.variants.some(
                  (candidate) => candidate.attributes[option.id] === value.id &&
                    availabilityByVariantId[candidate.id]?.status === "available",
                );
                const selected = selectedOptions[option.id] === value.id;

                return (
                  <button
                    key={value.id}
                    type="button"
                    value={value.id}
                    aria-label={option.key === "color"
                      ? formatProductMessage(copy.colorOptionTemplate, { index: index + 1 })
                      : `${label} ${value.label}`}
                    aria-pressed={selected}
                    disabled={!selectable}
                    onClick={() => onSelectOption(option.id, value.id)}
                    className={cn(
                      "flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-gray-0 px-4 py-2 type-body-sm font-medium text-gray-700 transition-colors enabled:hover:border-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
                      selected && "border-gold-500 bg-gold-50 text-gold-900 ring-1 ring-gold-500",
                      !selectable && "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60",
                    )}
                  >
                    <span className={cn("inline-flex min-w-0 items-center gap-2 [overflow-wrap:anywhere]", !selectable && "line-through")}>
                      {option.key === "color" ? (
                        <VariantColorSwatch className="size-8" value={value.id} />
                      ) : (
                        <span>{value.label}</span>
                      )}
                    </span>
                    {selected ? <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-gold-700" /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
function AvailabilityMessage({
  availability,
  copy,
  locationInCoverage,
  locationName,
}: {
  availability: ResolvedVariantAvailability;
  copy: ProductPurchasePanelCopy["availability"];
  locationInCoverage: boolean | null;
  locationName: string | null;
}) {
  const available = availability.status === "available";
  let message: string;

  if (locationInCoverage === false && locationName) {
    message = formatProductMessage(copy.uncoveredLocationTemplate, {
      city: locationName,
    });
  } else if (availability.status === "available") {
    message = locationName
      ? formatProductMessage(copy.availableAtLocationTemplate, {
          city: locationName,
          max: availability.maxOrderQuantity,
        })
      : formatProductMessage(copy.availableTemplate, {
          max: availability.maxOrderQuantity,
        });
  } else if (
    locationName &&
    (availability.status === "out_of_stock" ||
      availability.status === "unavailable_at_location")
  ) {
    message = formatProductMessage(copy.unavailableAtLocationTemplate, {
      city: locationName,
    });
  } else if (availability.status === "out_of_stock") {
    message = copy.outOfStock;
  } else if (availability.status === "purchase_unavailable") {
    message = copy.purchaseUnavailable;
  } else {
    message = copy.unavailableAtLocation;
  }

  return (
    <p
      id="product-availability"
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-md bg-gray-50 px-3 py-2.5 type-body-sm font-medium ${
        available
          ? "text-success"
          : "text-destructive"
      }`}
    >
      <MapPinIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function ProductSocialProofSummary({
  copy,
  locale,
  socialProof,
}: {
  copy: ProductPurchasePanelCopy["socialProof"];
  locale: Locale;
  socialProof: ProductDetails["socialProof"];
}) {
  const items = [
    {
      icon: EyeIcon,
      label: copy.viewersNow,
      value: socialProof.viewersNow,
    },
    {
      icon: ShoppingBagIcon,
      label: copy.timesOrdered,
      value: socialProof.timesOrdered,
    },
  ] as const;

  return (
    <dl className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center text-gold-700">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <dt className="sr-only">{label}</dt>
          <dd className="flex min-w-0 items-baseline gap-1.5">
            <strong className="type-body font-bold text-gray-900">
              <AnimatedProductMetric locale={locale} value={value} />
            </strong>
            <span className="type-caption text-gray-500">{label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ProductPurchasePanel({
  cartControls,
  addToCartErrorMessage,
  addingToCartLabel,
  availability,
  availabilityByVariantId,
  canAddToCart,
  copy,
  isAddingToCart,
  locale,
  locationInCoverage,
  locationName,
  bnplInformation,
  onAddToCart,
  onChangePersonalizationText,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onSelectPersonalizationLanguage,
  onSelectOption,
  personalizationInput,
  personalizationResetKey,
  personalizationValidation,
  product,
  quantity,
  remainingAddable,
  purchaseActionRef,
  renderedAt,
  selectedOptions,
  shareActions,
  variant,
}: ProductPurchasePanelProps) {
  const available = availability.status === "available";
  const canDecrease = available && quantity > 1;
  const canIncrease =
    available && remainingAddable !== null && quantity < remainingAddable;

  return (
    <section className="min-w-0 space-y-5 [&_input]:scroll-my-24" aria-labelledby="product-title">
      <div>
        <h1
          id="product-title"
          className="text-h3 break-words font-bold text-gray-900 sm:text-h2"
        >
          {product.name}
        </h1>
        {product.ratingSummary ? (
          <ProductHeaderRating
            summary={product.ratingSummary}
            locale={locale}
            ratingLabelTemplate={copy.ratingLabelTemplate}
            ratingSummaryTemplate={copy.ratingSummaryTemplate}
          />
        ) : null}
        {variant ? (
          <p className="mt-1 break-words type-caption text-gray-500">
            {formatProductMessage(copy.skuTemplate, { sku: `\u2068${variant.sku}\u2069` })}
          </p>
        ) : null}
      </div>

      {variant ? (
        <div className="space-y-2">
          <ProductPriceBlock
            locale={locale}
            pricing={variant.pricing}
            renderedAt={renderedAt}
            copy={copy.price}
          />
          <p className="flex items-center gap-2 type-body-sm text-gray-500">
            <ShieldCheckIcon aria-hidden="true" className="size-4 shrink-0" />
            {copy.price.vatInclusive}
          </p>
        </div>
      ) : null}

      <AvailabilityMessage
        availability={availability}
        copy={copy.availability}
        locationInCoverage={locationInCoverage}
        locationName={locationName}
      />

      <ProductSocialProofSummary
        copy={copy.socialProof}
        locale={locale}
        socialProof={product.socialProof}
      />

      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-5">
      <ProductVariants
        availabilityByVariantId={availabilityByVariantId}
        copy={copy.options}
        onSelectOption={onSelectOption}
        product={product}
        selectedOptions={selectedOptions}
      />
      <ProductPersonalizationFields
        compact
        key={personalizationResetKey}
        locale={locale}
        onChangeText={onChangePersonalizationText}
        onSelectLanguage={onSelectPersonalizationLanguage}
        personalizationInput={personalizationInput}
        personalizationValidation={personalizationValidation}
        product={product}
      />

      <div
        data-pdp-purchase-surface="main"
        tabIndex={-1}
        ref={purchaseActionRef}
        className="space-y-3"
      >
        <div className="grid items-center">
        {cartControls && <div className="col-start-1 row-start-1 flex justify-center py-3">{cartControls}</div>}
        <div aria-hidden={!!cartControls} inert={!!cartControls} className={cn("col-start-1 row-start-1 space-y-4", cartControls && "invisible pointer-events-none")}>
        <div className="flex items-center justify-between gap-4">
          <span className="type-body font-medium text-gray-900">
            {copy.quantity.title}
          </span>
          <div className="flex h-11 shrink-0 items-center justify-between rounded-md border border-gray-200 bg-gray-0">
            <button
              type="button"
              aria-label={copy.quantity.decrease}
              disabled={!canDecrease}
              onClick={onDecreaseQuantity}
              className="size-11 type-body-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-gray-300"
            >
              −
            </button>
            <output
              aria-label={formatProductMessage(copy.quantity.labelTemplate, {
                value: quantity,
              })}
              aria-live="polite"
              className="min-w-8 text-center type-body font-medium"
            >
              {quantity}
            </output>
            <button
              type="button"
              aria-label={copy.quantity.increase}
              disabled={!canIncrease}
              onClick={onIncreaseQuantity}
              className="size-11 type-body-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-gray-300"
            >
              +
            </button>
          </div>
        </div>
        {remainingAddable !== null ? (
          <p className="type-caption text-gray-500">
            {formatProductMessage(copy.quantity.remainingHintTemplate, {
              max: remainingAddable,
            })}
          </p>
        ) : null}
        <div>
          <Button
            data-pdp-add
            disabled={!canAddToCart || isAddingToCart}
            loading={isAddingToCart}
            loadingLabel={addingToCartLabel}
            size="lg"
            aria-describedby={
              addToCartErrorMessage
                ? "product-availability product-add-to-cart-error"
                : "product-availability"
            }
            className="w-full"
            onClick={onAddToCart}
          >
            {copy.addToCart}
          </Button>
        </div>
        </div>
        </div>
        {addToCartErrorMessage ? (
          <p
            id="product-add-to-cart-error"
            role="status"
            className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 type-body-sm text-destructive"
          >
            {addToCartErrorMessage}
          </p>
        ) : null}
      </div>
      </div>

      {bnplInformation}

      <div className="pt-1">{shareActions}</div>
    </section>
  );
}
