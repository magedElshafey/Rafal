import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { ShieldCheckIcon } from "@/components/ui/icons";
import { Rating } from "@/features/products/components/product-card";
import { ProductPriceBlock } from "@/features/products/components/product-details/product-price-block";
import type {
  PersonalizationLanguage,
  ProductDetails,
  ProductOption,
  ProductVariant,
} from "@/features/products/types/product-details.types";

type ProductPurchasePanelProps = {
  locale: Locale;
  product: ProductDetails;
  variant: ProductVariant;
};

function ProductOptionsPresentation({
  options,
  variant,
}: {
  options: readonly ProductOption[];
  variant: ProductVariant;
}) {
  if (options.length === 0) return null;

  const selectedValueIds = new Set(
    variant.optionValues.map(({ valueId }) => valueId),
  );

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <section key={option.id} aria-labelledby={`${option.id}-label`}>
          <h2 id={`${option.id}-label`} className="type-body font-medium">
            {option.name}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {option.values.map((value) => {
              const isDefault = selectedValueIds.has(value.id);

              return (
                <li
                  key={value.id}
                  className={
                    isDefault
                      ? "flex items-center gap-2 rounded-full border-2 border-gray-800 bg-gray-0 py-1 pe-3 ps-1"
                      : "flex items-center gap-2 rounded-full border border-gray-200 bg-gray-0 py-1 pe-3 ps-1"
                  }
                >
                  <span
                    aria-hidden="true"
                    className="size-8 rounded-full border border-gray-200"
                    style={{ backgroundColor: value.swatchHex }}
                  />
                  <span className="type-body-sm text-gray-700">
                    {value.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function ProductPersonalizationSummary({
  locale,
  product,
}: Pick<ProductPurchasePanelProps, "locale" | "product">) {
  if (!product.personalization.enabled) return null;

  const t = await getTranslations({
    locale,
    namespace: "Common.productDetails.personalization",
  });
  const languageLabels: Record<PersonalizationLanguage, string> = {
    arabic: t("languages.arabic"),
    english: t("languages.english"),
  };
  const inputId = `personalization-${product.id}`;

  return (
    <section
      aria-labelledby="product-personalization-title"
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="product-personalization-title" className="text-h4 font-bold">
            {t("title")}
          </h2>
          <p className="mt-1 type-body-sm text-gray-500">
            {t("description")}
          </p>
        </div>
        {product.personalization.additionalFee ? (
          <span className="rounded-full bg-gold-50 px-3 py-1 type-badge text-gold-700">
            {t("additionalFee", {
              amount: new Intl.NumberFormat(locale, {
                style: "currency",
                currency: product.personalization.additionalFee.currency,
              }).format(product.personalization.additionalFee.amount),
            })}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="type-label text-gray-700">{t("languageLabel")}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {product.personalization.allowedLanguages.map((language) => (
            <li
              key={language}
              className="rounded-full border border-gray-300 bg-gray-0 px-4 py-2 type-body-sm text-gray-700"
            >
              {languageLabels[language]}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <label htmlFor={inputId} className="type-label text-gray-700">
          {t("inputLabel")}
        </label>
        <input
          id={inputId}
          disabled
          maxLength={product.personalization.maxLength}
          placeholder={t("placeholder")}
          className="mt-2 h-11 w-full rounded-md border border-gray-200 bg-gray-0 px-4 type-body text-gray-400 disabled:cursor-not-allowed disabled:opacity-100"
        />
        <div className="mt-2 flex flex-wrap justify-between gap-2 type-caption text-gray-400">
          <span>{t("lettersAndSpaces")}</span>
          <span>{t("characterCount", { max: product.personalization.maxLength })}</span>
        </div>
      </div>
    </section>
  );
}

export async function ProductPurchasePanel({
  locale,
  product,
  variant,
}: ProductPurchasePanelProps) {
  const t = await getTranslations({
    locale,
    namespace: "Common.productDetails",
  });

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
          {t("sku", { sku: variant.sku })}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Rating
            value={product.ratingSummary.average}
            label={t("rating.label", { value: product.ratingSummary.average })}
          />
          <span className="type-body-sm text-gray-500">
            {t("rating.summary", {
              average: product.ratingSummary.average,
              count: product.ratingSummary.count,
            })}
          </span>
        </div>
      </div>

      <ProductPriceBlock
        locale={locale}
        pricing={variant.pricing}
        copy={{
          discount: (percentage) => t("price.discount", { percentage }),
          promotion: t("price.promotion"),
        }}
      />

      <p className="flex items-center gap-2 type-body-sm text-gray-500">
        <ShieldCheckIcon className="size-4 shrink-0" />
        {t("price.vatInclusive")}
      </p>

      <ProductOptionsPresentation options={product.options} variant={variant} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          disabled
          size="lg"
          className="w-full flex-1 disabled:bg-gray-1000 disabled:text-gray-0"
        >
          {t("addToCart")}
        </Button>
        <p className="shrink-0 rounded-md border border-gray-200 px-4 py-3 text-center type-body text-gray-700">
          {t("quantity", { value: 1 })}
        </p>
      </div>

      <ProductPersonalizationSummary locale={locale} product={product} />
    </section>
  );
}
