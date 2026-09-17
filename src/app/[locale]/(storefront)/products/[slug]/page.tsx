import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { ProductDescription } from "@/features/products/components/product-details/product-description";
import { ProductPurchaseExperience } from "@/features/products/components/product-details/product-purchase-experience";
import { getResolvedVariantAvailability } from "@/features/products/server/product-availability-boundary";
import { getProductDetailsBySlug } from "@/features/products/server/product-boundary";
import { assertProductConfiguration } from "@/features/products/utils/assert-product-configuration";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const [{ slug }, locale] = await Promise.all([
    params,
    getLocale(),
  ]);
  const [product, t, city] = await Promise.all([
    getProductDetailsBySlug(slug, locale),
    getTranslations({
      locale,
      namespace: "Common.productDetails",
    }),
    resolveCurrentLocation(locale),
  ]);

  if (!product) notFound();

  assertProductConfiguration(product);
  const availabilityByVariantId = await getResolvedVariantAvailability({
    locationId: city?.id ?? null,
    variants: product.variants,
  });
  const purchaseProduct = {
    defaultVariantId: product.defaultVariantId,
    id: product.id,
    images: product.images,
    name: product.name,
    options: product.options,
    personalization: product.personalization,
    ratingSummary: product.ratingSummary,
    variants: product.variants,
  };
  const renderedAt = new Date().getTime();

  return (
    <Container className="main-content-spacing lg:px-[3.75rem]">
      <Breadcrumbs
        label={t("breadcrumbs.label")}
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          {
            label: product.category.name,
            href: `/categories/${product.category.slug}`,
          },
          { label: product.name },
        ]}
      />

      <ProductPurchaseExperience
        availabilityByVariantId={availabilityByVariantId}
        locale={locale}
        product={purchaseProduct}
        renderedAt={renderedAt}
        copy={{
          gallery: {
            selectImageTemplate: t.raw("gallery.selectImage") as string,
          },
          panel: {
            addToCart: t("addToCart"),
            availability: {
              availableTemplate: t.raw(
                "availability.available",
              ) as string,
              outOfStock: t("availability.outOfStock"),
              unavailableAtLocation: t(
                "availability.unavailableAtLocation",
              ),
            },
            personalization: {
              additionalFeeTemplate: t.raw(
                "personalization.additionalFee",
              ) as string,
              characterCountTemplate: t.raw(
                "personalization.characterCount",
              ) as string,
              description: t("personalization.description"),
              inputLabel: t("personalization.inputLabel"),
              languageLabel: t("personalization.languageLabel"),
              languages: {
                arabic: t("personalization.languages.arabic"),
                english: t("personalization.languages.english"),
              },
              characterPolicies: {
                "letters-and-spaces": t(
                  "personalization.characterPolicies.lettersAndSpaces",
                ),
              },
              errors: {
                invalidCharacters: t(
                  "personalization.errors.invalidCharacters",
                ),
                languageScriptMismatchTemplate: t.raw(
                  "personalization.errors.languageScriptMismatch",
                ) as string,
                required: t("personalization.errors.required"),
                tooLongTemplate: t.raw(
                  "personalization.errors.tooLong",
                ) as string,
                unsupportedLanguage: t(
                  "personalization.errors.unsupportedLanguage",
                ),
              },
              placeholder: t("personalization.placeholder"),
              title: t("personalization.title"),
            },
            price: {
              countdown: {
                days: t("price.countdown.days"),
                expired: t("price.countdown.expired"),
                hours: t("price.countdown.hours"),
                label: t("price.countdown.label"),
                minutes: t("price.countdown.minutes"),
                seconds: t("price.countdown.seconds"),
              },
              discountTemplate: t.raw("price.discount") as string,
              promotion: t("price.promotion"),
              vatInclusive: t("price.vatInclusive"),
            },
            quantity: {
              decrease: t("quantity.decrease"),
              increase: t("quantity.increase"),
              labelTemplate: t.raw("quantity.label") as string,
            },
            ratingLabelTemplate: t.raw("rating.label") as string,
            ratingSummaryTemplate: t.raw("rating.summary") as string,
            skuTemplate: t.raw("sku") as string,
          },
        }}
      />

      <div className="mt-10 border-t border-gray-200 pt-8 lg:mt-12 lg:pt-10">
        <ProductDescription
          description={product.description}
          title={t("descriptionTitle")}
        />
      </div>
    </Container>
  );
}
