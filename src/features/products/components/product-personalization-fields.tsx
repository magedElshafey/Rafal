"use client";

import { useId, useState } from "react";
import { useTranslations, type Locale } from "next-intl";
import { FieldFeedback } from "@/components/ui/field";
import type { PersonalizationLanguage, ProductDetails, ProductPersonalizationInput } from "@/features/products/types/product-details.types";
import type { ProductPersonalizationValidationResult } from "@/features/products/utils/validate-product-personalization";

export function ProductPersonalizationFields({ locale, product, personalizationInput, personalizationValidation, onChangeText, onSelectLanguage }: {
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
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-h4 font-bold">{t("title")}</h2>
          <p className="mt-1 type-body-sm text-gray-500">{t("description")}</p>
        </div>
        {config.additionalFee && <span className="rounded-full bg-gold-50 px-3 py-1 type-badge text-gold-700">{t("additionalFee", {
          amount: new Intl.NumberFormat(locale, { style: "currency", currency: config.additionalFee.currency }).format(config.additionalFee.amount),
        })}</span>}
      </div>
      <fieldset className="mt-4">
        <legend className="type-label text-gray-700">{t("languageLabel")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {config.allowedLanguages.map(language => <label key={language} className="relative cursor-pointer">
            <input type="radio" name={`${id}-language`} value={language} checked={personalizationInput.language === language}
              onChange={() => { onSelectLanguage(language); if (personalizationInput.text.trim().length > 0) setHasInteracted(true); }} className="peer sr-only" />
            <span className="flex min-h-11 items-center rounded-full border border-gray-300 bg-gray-0 px-4 py-2 type-body-sm text-gray-700 peer-checked:border-gold-500 peer-checked:bg-gold-500 peer-checked:text-gray-0 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">{t(`languages.${language}`)}</span>
          </label>)}
        </div>
      </fieldset>
      <div className="mt-4">
        <label htmlFor={id} className="type-label text-gray-700">{t("inputLabel")}</label>
        <input id={id} required value={personalizationInput.text} maxLength={config.maxLength} placeholder={t("placeholder")}
          dir={personalizationInput.language === "arabic" ? "rtl" : "ltr"}
          onChange={event => { setHasInteracted(true); onChangeText(event.target.value); }} onBlur={() => setHasInteracted(true)}
          aria-invalid={showError || undefined} aria-describedby={`${id}-counter${showError ? ` ${id}-error` : ""}`}
          className={`mt-2 h-11 w-full rounded-md border bg-gray-0 px-4 type-body text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${showError ? "border-destructive" : "border-gray-200"}`} />
        <div className="mt-2 flex flex-wrap justify-between gap-2 type-caption text-gray-400">
          <span id={`${id}-counter`}>{t("characterCount", { count: personalizationInput.text.length, max: config.maxLength })}</span>
        </div>
        <FieldFeedback id={`${id}-error`} className="mt-2" reserve={[t("errors.required"), t("errors.unsupportedLanguage"), t("errors.tooLong", { max: config.maxLength })]}>
          {showError ? errorMessage : null}
        </FieldFeedback>
      </div>
    </section>
  );
}
