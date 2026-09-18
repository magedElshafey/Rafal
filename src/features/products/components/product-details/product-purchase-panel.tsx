import type { Locale } from "next-intl";
import { useState, type MouseEventHandler, type Ref } from "react";

import { Button } from "@/components/ui/button";
import { ShieldCheckIcon } from "@/components/ui/icons";
import { ProductPriceBlock } from "@/features/products/components/product-details/product-price-block";
import { Rating } from "@/features/products/components/product-card/rating";
import type { ResolvedVariantAvailability } from "@/features/products/types/product-availability.types";
import type {
  PersonalizationCharacterPolicy,
  PersonalizationLanguage,
  ProductDetails,
  ProductOption,
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

export type ProductPurchasePanelCopy = {
  addToCart: string;
  availability: {
    availableTemplate: string;
    outOfStock: string;
    unavailableAtLocation: string;
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
  };
  ratingLabelTemplate: string;
  ratingSummaryTemplate: string;
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
    "id" | "name" | "options" | "personalization" | "ratingSummary" | "variants"
  >;
  quantity: number;
  purchaseActionRef: Ref<HTMLDivElement>;
  renderedAt: number;
  selectedOptions: SelectedProductOptions;
  variant: ProductVariant;
};

function ProductOptions({
  onSelectOption,
  options,
  selectedOptions,
  variants,
}: {
  onSelectOption: (optionId: string, valueId: string) => void;
  options: readonly ProductOption[];
  selectedOptions: SelectedProductOptions;
  variants: readonly ProductVariant[];
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <fieldset key={option.id}>
          <legend className="type-body font-medium">{option.name}</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {option.values.map((value) => {
              const candidateSelection = {
                ...selectedOptions,
                [option.id]: value.id,
              };
              const selectable =
                resolveProductVariant(options, variants, candidateSelection) !==
                null;
              const inputId = `${option.id}-${value.id}`;

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
                    checked={selectedOptions[option.id] === value.id}
                    disabled={!selectable}
                    onChange={() => onSelectOption(option.id, value.id)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-gray-0 py-1 pe-3 ps-1 peer-checked:border-2 peer-checked:border-gray-800 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-40">
                    <span
                      aria-hidden="true"
                      className="size-8 shrink-0 rounded-full border border-gray-200"
                      style={{ backgroundColor: value.swatchHex }}
                    />
                    <span className="type-body-sm text-gray-700">
                      {value.label}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
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
}: {
  availability: ResolvedVariantAvailability;
  copy: ProductPurchasePanelCopy["availability"];
}) {
  const available = availability.status === "available";
  const message = available
    ? formatProductMessage(copy.availableTemplate, {
        max: availability.maxOrderQuantity,
      })
    : availability.status === "out_of_stock"
      ? copy.outOfStock
      : copy.unavailableAtLocation;

  return (
    <p
      id="product-availability"
      className={
        available
          ? "rounded-md border border-success/20 bg-success/10 px-4 py-3 type-body-sm text-success"
          : "rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 type-body-sm text-destructive"
      }
    >
      {message}
    </p>
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
  purchaseActionRef,
  renderedAt,
  selectedOptions,
  variant,
}: ProductPurchasePanelProps) {
  const available = availability.status === "available";
  const canDecrease = available && quantity > 1;
  const canIncrease =
    available && quantity < availability.maxOrderQuantity;

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="product-title">
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
      </div>

      <ProductPriceBlock
        locale={locale}
        pricing={variant.pricing}
        renderedAt={renderedAt}
        copy={copy.price}
      />

      <p className="flex items-center gap-2 type-body-sm text-gray-500">
        <ShieldCheckIcon className="size-4 shrink-0" />
        {copy.price.vatInclusive}
      </p>

      <ProductOptions
        onSelectOption={onSelectOption}
        options={product.options}
        selectedOptions={selectedOptions}
        variants={product.variants}
      />

      <AvailabilityMessage availability={availability} copy={copy.availability} />

      <div ref={purchaseActionRef}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            className="w-full flex-1"
            onClick={onAddToCart}
          >
            {copy.addToCart}
          </Button>
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

      <ProductPersonalizationSummary
        copy={copy.personalization}
        locale={locale}
        onChangeText={onChangePersonalizationText}
        onSelectLanguage={onSelectPersonalizationLanguage}
        personalizationInput={personalizationInput}
        personalizationValidation={personalizationValidation}
        product={product}
      />
    </section>
  );
}
