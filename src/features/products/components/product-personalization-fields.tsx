"use client";

import { useId, useState } from "react";
import { useTranslations, type Locale } from "next-intl";
import { FieldFeedback } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { PersonalizationLanguage, ProductDetails, ProductPersonalizationInput } from "@/features/products/types/product-details.types";
import type { ProductPersonalizationValidationResult } from "@/features/products/utils/validate-product-personalization";

export function ProductPersonalizationFields({ locale, product, personalizationInput, personalizationValidation, onChangeText, onSelectLanguage, compact = false }: {
  compact?: boolean;
  locale: Locale;
  product: Pick<ProductDetails, "personalization">;
  personalizationInput: ProductPersonalizationInput | null;
  personalizationValidation: ProductPersonalizationValidationResult | null;
  onChangeText: (text: string) => void;
  onSelectLanguage: (language: PersonalizationLanguage) => void;
}) {
  const t = useTranslations("Common.productDetails.personalization");
  const id = useId();
  const [hasInteracted, setHasInteracted] = useState(false);
  if (!product.personalization.enabled) return null;
  if (product.personalization.allowedLanguages.length === 0) {
    return <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 type-body-sm text-destructive sm:p-5" role="status">{t("configurationUnavailable")}</p>;
  }
  if (!personalizationInput || !personalizationValidation) return null;
  const config = product.personalization;
  const error = personalizationValidation.valid ? null : personalizationValidation.error;
  const showError = error !== null && (hasInteracted || personalizationInput.text.length > 0);
  const errorMessage = error?.code === "required" ? t("errors.required")
    : error?.code === "unsupported-language" ? t("errors.unsupportedLanguage")
    : error?.code === "too-long" ? t("errors.tooLong", { max: error.maxLength }) : null;
  const fee = config.additionalFee ? t("additionalFee", {
    amount: new Intl.NumberFormat(locale, { style: "currency", currency: config.additionalFee.currency }).format(config.additionalFee.amount),
  }) : null;
  return (
    <section aria-labelledby={`${id}-title`} className={compact ? "border-t border-gray-200 pt-4" : "rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 id={`${id}-title`} className={compact ? "type-body font-semibold text-gray-900" : "text-h4 font-bold"}>{t("title")}</h2>
            {compact && <span className="type-caption text-gold-700">{t("requiredLabel")}</span>}
          </div>
          <p className={cn("mt-1", compact ? "type-caption text-gray-600" : "type-body-sm text-gray-500")}>{t("description")}</p>
        </div>
        {!compact && fee && <span className="rounded-full bg-gold-50 px-3 py-1 type-badge text-gold-700">{fee}</span>}
      </div>
      <fieldset className={compact ? "mt-3 flex flex-wrap items-center gap-2" : "mt-4"}>
        <legend className={compact ? "sr-only" : "type-label text-gray-700"}>{t("languageLabel")}</legend>
        {compact && <span aria-hidden="true" className="me-auto type-caption text-gray-600">{t("languageLabel")}</span>}
        <div className={compact ? "flex max-w-full flex-wrap rounded-md border border-gray-200 bg-gray-50 p-1" : "mt-2 flex flex-wrap gap-2"}>
          {config.allowedLanguages.map(language => <label key={language} className="relative min-w-0 cursor-pointer">
            <input type="radio" name={`${id}-language`} value={language} checked={personalizationInput.language === language}
              onChange={() => { onSelectLanguage(language); if (personalizationInput.text.trim().length > 0) setHasInteracted(true); }} className="peer sr-only" />
            <span className={compact ? "flex min-h-11 items-center rounded-sm border border-transparent py-2 ps-3 pe-8 type-body-sm text-gray-600 peer-checked:border-gray-200 peer-checked:bg-gray-0 peer-checked:text-gray-1000 peer-focus-visible:ring-2 peer-focus-visible:ring-ring" : "flex min-h-11 items-center rounded-full border border-gray-300 bg-gray-0 px-4 py-2 type-body-sm text-gray-700 peer-checked:border-gold-500 peer-checked:bg-gold-500 peer-checked:text-gray-0 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"}>{t(`languages.${language}`)}</span>
            {compact && <CheckIcon aria-hidden="true" className="pointer-events-none absolute end-2 top-1/2 size-4 -translate-y-1/2 text-gold-700 opacity-0 peer-checked:opacity-100" />}
          </label>)}
        </div>
      </fieldset>
      <div className={compact ? "mt-3" : "mt-4"}>
        <label htmlFor={id} className="type-label text-gray-700">{t("inputLabel")}</label>
        <input id={id} required value={personalizationInput.text} maxLength={config.maxLength} placeholder={t("placeholder")}
          dir={personalizationInput.language === "arabic" ? "rtl" : "ltr"}
          onChange={event => { setHasInteracted(true); onChangeText(event.target.value); }} onBlur={() => setHasInteracted(true)}
          aria-invalid={showError || undefined} aria-describedby={`${id}-counter${showError ? ` ${id}-error` : ""}`}
          className={`mt-2 h-11 w-full rounded-md border bg-gray-0 px-4 type-body text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${showError ? "border-destructive" : "border-gray-200"}`} />
        <div className={cn("mt-2 flex flex-wrap justify-between gap-2 type-caption", compact ? "text-gray-600" : "text-gray-400")}>
          <span id={`${id}-counter`}>{t("characterCount", { count: personalizationInput.text.length, max: config.maxLength })}</span>
          {compact && fee && <span>{fee}</span>}
        </div>
        <FieldFeedback id={`${id}-error`} role={compact ? "status" : undefined} className={compact ? "mt-1" : "mt-2"} reserve={[t("errors.required"), t("errors.unsupportedLanguage"), t("errors.tooLong", { max: config.maxLength })]}>
          {showError ? errorMessage : null}
        </FieldFeedback>
      </div>
    </section>
  );
}
