import type { Locale } from "next-intl";
import {
  useState,
  useSyncExternalStore,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from "react";

import { Button } from "@/components/ui/button";
import {
  CheckIcon,
  EyeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
} from "@/components/ui/icons";
import { AnimatedProductMetric } from "@/features/products/components/product-details/animated-product-metric";
import { ProductPriceBlock } from "@/features/products/components/product-details/product-price-block";
import { Rating } from "@/features/products/components/product-card/rating";
import type { ResolvedVariantAvailability } from "@/features/products/types/product-availability.types";
import type {
  PersonalizationCharacterPolicy,
  PersonalizationLanguage,
  ProductDetails,
  ProductOption,
  ProductOptionValue,
  ProductPersonalizationInput,
  ProductVariant,
} from "@/features/products/types/product-details.types";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import type { SelectedProductOptions } from "@/features/products/utils/product-variant-resolver";
import { resolveProductVariant } from "@/features/products/utils/product-variant-resolver";
import type {
  ProductPersonalizationValidationError,
  ProductPersonalizationValidationResult,
} from "@/features/products/utils/validate-product-personalization";
import { cn } from "@/lib/utils";

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
  personalization: {
    additionalFeeTemplate: string;
    characterCountTemplate: string;
    description: string;
    inputLabel: string;
    languages: Record<PersonalizationLanguage, string>;
    languageLabel: string;
    characterPolicies: Record<PersonalizationCharacterPolicy, string>;
    errors: {
      invalidCharacters: string;
      languageScriptMismatchTemplate: string;
      required: string;
      tooLongTemplate: string;
      unsupportedLanguage: string;
    };
    placeholder: string;
    title: string;
  };
  options: {
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
  addToCartErrorMessage: string | null;
  addingToCartLabel: string;
  availability: ResolvedVariantAvailability;
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
  onSelectPersonalizationLanguage: (
    language: PersonalizationLanguage,
  ) => void;
  onSelectOption: (optionId: string, valueId: string) => void;
  personalizationInput: ProductPersonalizationInput | null;
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
  variant: ProductVariant;
};

const NON_VISUAL_CSS_COLORS = new Set([
  "currentcolor",
  "inherit",
  "initial",
  "revert",
  "revert-layer",
  "transparent",
  "unset",
]);

function subscribeToCssColorSupport() {
  return () => undefined;
}

function isUsableCssColor(value: string): boolean {
  const normalizedValue = value.trim();
  if (
    normalizedValue.length === 0 ||
    NON_VISUAL_CSS_COLORS.has(normalizedValue.toLowerCase()) ||
    /^(?:env|var)\(/i.test(normalizedValue) ||
    typeof CSS === "undefined"
  ) {
    return false;
  }

  return CSS.supports("color", normalizedValue);
}

function ColorOptionSwatch({ value }: { value: ProductOptionValue }) {
  const colorValue = value.swatchHex ?? value.label;
  const canRenderSwatch = useSyncExternalStore(
    subscribeToCssColorSupport,
    () => isUsableCssColor(colorValue),
    () => false,
  );

  return canRenderSwatch ? (
    <span
      aria-hidden="true"
      className="size-7 shrink-0 rounded-full border border-gray-300 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_70%)]"
      style={{ backgroundColor: colorValue }}
    />
  ) : null;
}

function getOptionLabel(
  option: ProductOption,
  locale: Locale,
  copy: ProductPurchasePanelCopy["options"],
): string {
  const presentationKey = option.key.trim().toLowerCase();
  if (presentationKey === "size") return copy.labels.size;
  if (presentationKey === "color") return copy.labels.color;

  const fallback = option.name.trim().replace(/[_-]+/g, " ");
  const [firstCharacter, ...remainingCharacters] = fallback;
  return firstCharacter
    ? `${firstCharacter.toLocaleUpperCase(locale)}${remainingCharacters.join("")}`
    : option.key;
}

function ProductOptions({
  copy,
  locale,
  onSelectOption,
  options,
  selectedOptions,
  variants,
}: {
  copy: ProductPurchasePanelCopy["options"];
  locale: Locale;
  onSelectOption: (optionId: string, valueId: string) => void;
  options: readonly ProductOption[];
  selectedOptions: SelectedProductOptions;
  variants: readonly ProductVariant[];
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-5 border-t border-gray-200 pt-6">
      {options.map((option) => {
        const presentationKey = option.key.trim().toLowerCase();
        const isColorOption = presentationKey === "color";
        const isSizeOption = presentationKey === "size";
        const optionLabel = getOptionLabel(option, locale, copy);

        return (
          <fieldset key={option.id}>
            <legend className="type-body font-medium text-gray-900">
              {optionLabel}
            </legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {option.values.map((value) => {
                const candidateSelection = {
                  ...selectedOptions,
                  [option.id]: value.id,
                };
                const selectable =
                  resolveProductVariant(
                    options,
                    variants,
                    candidateSelection,
                  ) !== null;
                const inputId = `${option.id}-${value.id}`;
                const selected = selectedOptions[option.id] === value.id;

                return (
                  <label
                    key={value.id}
                    htmlFor={inputId}
                    className="relative cursor-pointer"
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name={option.id}
                      value={value.id}
                      checked={selected}
                      disabled={!selectable}
                      aria-label={`${optionLabel}: ${value.label}`}
                      onChange={() => onSelectOption(option.id, value.id)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex min-h-11 items-center justify-center gap-2 border bg-gray-0 px-4 type-body-sm font-medium text-gray-700 transition-colors peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 motion-reduce:transition-none",
                        isColorOption ? "rounded-full ps-2" : "rounded-md",
                        isSizeOption && "min-w-12",
                        selected &&
                          "border-gold-500 bg-gold-50 text-gold-900 ring-1 ring-gold-500",
                        !selectable &&
                          "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60",
                      )}
                    >
                      {isColorOption ? (
                        <ColorOptionSwatch value={value} />
                      ) : value.swatchHex ? (
                        <span
                          aria-hidden="true"
                          className="size-7 shrink-0 rounded-full border border-gray-300"
                          style={{ backgroundColor: value.swatchHex }}
                        />
                      ) : null}
                      <span className={cn(!selectable && "line-through")}>
                        {value.label}
                      </span>
                      {selected ? (
                        <CheckIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-gold-700"
                        />
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function ProductPersonalizationSummary({
  copy,
  locale,
  onChangeText,
  onSelectLanguage,
  personalizationInput,
  personalizationValidation,
  product,
}: {
  copy: ProductPurchasePanelCopy["personalization"];
  locale: Locale;
  onChangeText: (text: string) => void;
  onSelectLanguage: (language: PersonalizationLanguage) => void;
  personalizationInput: ProductPersonalizationInput | null;
  personalizationValidation: ProductPersonalizationValidationResult | null;
  product: Pick<ProductDetails, "id" | "personalization">;
}) {
  const [hasInteracted, setHasInteracted] = useState(false);

  if (
    !product.personalization.enabled ||
    !personalizationInput ||
    !personalizationValidation
  ) {
    return null;
  }

  const inputId = `personalization-${product.id}`;
  const policyId = `${inputId}-policy`;
  const counterId = `${inputId}-counter`;
  const errorId = `${inputId}-error`;
  const showError =
    !personalizationValidation.valid &&
    (hasInteracted || personalizationInput.text.length > 0);
  const errorMessage = personalizationValidation.valid
    ? null
    : getPersonalizationErrorMessage(
        personalizationValidation.error,
        copy,
      );
  const describedBy = [policyId, counterId, showError ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      aria-labelledby="product-personalization-title"
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="product-personalization-title" className="text-h4 font-bold">
            {copy.title}
          </h2>
          <p className="mt-1 type-body-sm text-gray-500">{copy.description}</p>
        </div>
        {product.personalization.additionalFee ? (
          <span className="rounded-full bg-gold-50 px-3 py-1 type-badge text-gold-700">
            {formatProductMessage(copy.additionalFeeTemplate, {
              amount: new Intl.NumberFormat(locale, {
                style: "currency",
                currency: product.personalization.additionalFee.currency,
              }).format(product.personalization.additionalFee.amount),
            })}
          </span>
        ) : null}
      </div>

      <fieldset className="mt-4">
        <legend className="type-label text-gray-700">
          {copy.languageLabel}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.personalization.allowedLanguages.map((language) => (
            <label
              key={language}
              className="relative cursor-pointer"
            >
              <input
                type="radio"
                name={`${inputId}-language`}
                value={language}
                checked={personalizationInput.language === language}
                onChange={() => {
                  onSelectLanguage(language);
                  if (personalizationInput.text.trim().length > 0) {
                    setHasInteracted(true);
                  }
                }}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center rounded-full border border-gray-300 bg-gray-0 px-4 py-2 type-body-sm text-gray-700 peer-checked:border-gold-500 peer-checked:bg-gold-500 peer-checked:text-gray-0 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                {copy.languages[language]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor={inputId} className="type-label text-gray-700">
          {copy.inputLabel}
        </label>
        <input
          id={inputId}
          value={personalizationInput.text}
          onChange={(event) => {
            setHasInteracted(true);
            onChangeText(event.target.value);
          }}
          onBlur={() => setHasInteracted(true)}
          maxLength={product.personalization.maxLength}
          placeholder={copy.placeholder}
          dir={personalizationInput.language === "arabic" ? "rtl" : "ltr"}
          aria-invalid={showError || undefined}
          aria-describedby={describedBy}
          className={`mt-2 h-11 w-full rounded-md border bg-gray-0 px-4 type-body text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            showError ? "border-destructive" : "border-gray-200"
          }`}
        />
        <div className="mt-2 flex flex-wrap justify-between gap-2 type-caption text-gray-400">
          <span id={policyId}>
            {copy.characterPolicies[product.personalization.characterPolicy]}
          </span>
          <span id={counterId}>
            {formatProductMessage(copy.characterCountTemplate, {
              count: personalizationInput.text.length,
              max: product.personalization.maxLength,
            })}
          </span>
        </div>
        {showError && errorMessage ? (
          <p id={errorId} className="mt-2 type-caption text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function getPersonalizationErrorMessage(
  error: ProductPersonalizationValidationError,
  copy: ProductPurchasePanelCopy["personalization"],
): string {
  switch (error.code) {
    case "required":
      return copy.errors.required;
    case "unsupported-language":
      return copy.errors.unsupportedLanguage;
    case "too-long":
      return formatProductMessage(copy.errors.tooLongTemplate, {
        max: error.maxLength,
      });
    case "invalid-characters":
      return copy.errors.invalidCharacters;
    case "language-script-mismatch":
      return formatProductMessage(
        copy.errors.languageScriptMismatchTemplate,
        { language: copy.languages[error.language] },
      );
  }
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
      className={`flex items-start gap-3 border-s-2 py-2 ps-3 type-body-sm font-medium ${
        available
          ? "border-success text-success"
          : "border-destructive text-destructive"
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
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-gray-200 py-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700">
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
  addToCartErrorMessage,
  addingToCartLabel,
  availability,
  canAddToCart,
  copy,
  isAddingToCart,
  locale,
  locationAction,
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
    available &&
    remainingAddable !== null &&
    quantity < remainingAddable;

  return (
    <section className="min-w-0 space-y-6" aria-labelledby="product-title">
      <div>
        <h1
          id="product-title"
          className="text-h1 break-words font-bold text-gray-900"
        >
          {product.name}
        </h1>
        <p className="mt-2 type-body-sm text-gray-400">
          {formatProductMessage(copy.skuTemplate, { sku: variant.sku })}
        </p>
        {product.ratingSummary ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Rating
              value={product.ratingSummary.average}
              label={formatProductMessage(copy.ratingLabelTemplate, {
                value: product.ratingSummary.average,
              })}
            />
            <span className="type-body-sm text-gray-500">
              {formatProductMessage(copy.ratingSummaryTemplate, {
                average: product.ratingSummary.average,
                count: product.ratingSummary.count,
              })}
            </span>
          </div>
        ) : null}
      </div>

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

      <ProductSocialProofSummary
        copy={copy.socialProof}
        locale={locale}
        socialProof={product.socialProof}
      />

      <AvailabilityMessage
        availability={availability}
        copy={copy.availability}
        locationInCoverage={locationInCoverage}
        locationName={locationName}
      />
      {locationInCoverage === false ? locationAction : null}

      <ProductOptions
        copy={copy.options}
        locale={locale}
        onSelectOption={onSelectOption}
        options={product.options}
        selectedOptions={selectedOptions}
        variants={product.variants}
      />

      <ProductPersonalizationSummary
        copy={copy.personalization}
        locale={locale}
        onChangeText={onChangePersonalizationText}
        onSelectLanguage={onSelectPersonalizationLanguage}
        personalizationInput={personalizationInput}
        personalizationValidation={personalizationValidation}
        product={product}
      />

      <div
        ref={purchaseActionRef}
        className="space-y-4 border-t border-gray-200 pt-6"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="type-body font-medium text-gray-900">
            {copy.quantity.title}
          </span>
          <div className="flex h-13 shrink-0 items-center justify-between rounded-md border border-gray-200 bg-gray-0">
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

      <div className="border-t border-gray-200 pt-5">{bnplInformation}</div>

      <div className="border-t border-gray-200 pt-5">{shareActions}</div>
    </section>
  );
}
