import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { serverEnv } from "@/config/server-env";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { resolveLocationByCityId } from "@/features/location/api/location-api.server";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { getCanonicalBackendCityId } from "@/features/location/types";
import { ComplementaryProducts } from "@/features/products/components/product-details/complementary-products";
import { ProductBnplInformation } from "@/features/products/components/product-details/product-bnpl-information";
import { ProductDescription } from "@/features/products/components/product-details/product-description";
import { ProductPurchaseExperience } from "@/features/products/components/product-details/product-purchase-experience";
import { ProductShareActions } from "@/features/products/components/product-details/product-share-actions";
import { RelatedProducts } from "@/features/products/components/product-details/related-products";
import { getResolvedVariantAvailability } from "@/features/products/server/product-availability-boundary";
import { getProductDetailsBySlug } from "@/features/products/server/product-boundary";
import {
  getComplementaryProducts,
  getRelatedProducts,
} from "@/features/products/server/product-discovery-boundary";
import { assertProductConfiguration } from "@/features/products/utils/assert-product-configuration";
import {
  createProductStructuredData,
  serializeStructuredData,
} from "@/features/products/utils/create-product-structured-data";
import { ProductReviewsSection } from "@/features/reviews/components/product-reviews-section";
import { getPublishedProductReviews } from "@/features/reviews/server/product-review-boundary";
import { getPublicSettings } from "@/features/settings/server/public-settings-boundary";
import { getLocalizedAlternates } from "@/lib/seo/alternates";
import { sanitizeHtmlToText } from "@/lib/security/sanitize-html";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const SHARE_DESCRIPTION_MAX_LENGTH = 140;

function createShareDescription(html: string): string {
  const plainText = sanitizeHtmlToText(html, "product-rich-text")
    .replace(/\s+/g, " ")
    .trim();
  if (plainText.length <= SHARE_DESCRIPTION_MAX_LENGTH) return plainText;

  const candidate = plainText.slice(0, SHARE_DESCRIPTION_MAX_LENGTH + 1);
  const lastWordBoundary = candidate.lastIndexOf(" ");
  const excerpt = candidate
    .slice(
      0,
      lastWordBoundary > SHARE_DESCRIPTION_MAX_LENGTH / 2
        ? lastWordBoundary
        : SHARE_DESCRIPTION_MAX_LENGTH,
    )
    .trimEnd();

  return `${excerpt}…`;
}

async function getProductPageData(slug: string, locale: Locale) {
  const city = await resolveCurrentLocation(locale);
  const cityId = getCanonicalBackendCityId(city) ?? undefined;
  const [readResult, resolvedLocation] = await Promise.all([
    getProductDetailsBySlug(slug, locale, cityId),
    serverEnv.useMockApi || cityId === undefined
      ? Promise.resolve(null)
      : resolveLocationByCityId(cityId, locale),
  ]);

  return { city, cityId, readResult, resolvedLocation };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const { readResult } = await getProductPageData(slug, locale);
  const { product } = readResult;

  if (!product) return {};

  const pathname = `/products/${product.slug}`;
  const canonicalUrl = new URL(`/${locale}${pathname}`, serverEnv.siteUrl);
  const description = sanitizeHtmlToText(
    product.description.html,
    "product-rich-text",
  );
  const primaryImage = product.images[0];
  const socialImage = primaryImage
    ? {
        url: new URL(primaryImage.src, serverEnv.siteUrl).toString(),
        alt: primaryImage.alt,
      }
    : null;

  return {
    title: product.name,
    ...(description ? { description } : {}),
    alternates: getLocalizedAlternates(locale, pathname),
    openGraph: {
      title: product.name,
      ...(description ? { description } : {}),
      type: "website",
      url: canonicalUrl,
      locale,
      ...(socialImage ? { images: [socialImage] } : {}),
    },
    twitter: {
      card: socialImage ? "summary_large_image" : "summary",
      title: product.name,
      ...(description ? { description } : {}),
      ...(socialImage ? { images: [socialImage.url] } : {}),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const [
    { city, cityId, readResult, resolvedLocation },
    t,
    listingT,
    publicSettings,
  ] =
    await Promise.all([
      getProductPageData(slug, locale),
      getTranslations({
        locale,
        namespace: "Common.productDetails",
      }),
      getTranslations({
        locale,
        namespace: "Common.productListing",
      }),
      getPublicSettings(),
    ]);
  const { product, source } = readResult;

  if (!product) notFound();

  assertProductConfiguration(product);
  const usesMockProductSource = source === "mock";
  const [
    availabilityByVariantId,
    relatedProducts,
    complementaryProducts,
    reviewReadResult,
  ] = await Promise.all([
    source === "laravel"
      ? resolvedLocation
        ? getResolvedVariantAvailability({
            maxOrderQuantity: publicSettings.maxCartItemQuantity,
            source,
            variants: product.variants,
            warehouseId: resolvedLocation.warehouseId,
          })
        : Promise.resolve(
            Object.fromEntries(
              product.variants.map((variant) => [
                variant.id,
                { status: "purchase_unavailable" as const },
              ]),
            ),
          )
      : getResolvedVariantAvailability({
          locationId: null,
          source,
          variants: product.variants,
        }),
    usesMockProductSource
      ? getRelatedProducts({
          categoryId: product.category.id,
          currentProductId: product.id,
          locale,
        })
      : Promise.resolve([]),
    usesMockProductSource
      ? getComplementaryProducts({
          currentProductId: product.id,
          locale,
          locationId: null,
        })
      : Promise.resolve([]),
    usesMockProductSource
      ? getPublishedProductReviews(product.id, locale)
      : Promise.resolve(null),
  ]);
  const purchaseProduct = {
    id: product.id,
    images: product.images,
    name: product.name,
    options: product.options,
    personalization: product.personalization,
    ratingSummary: product.ratingSummary,
    socialProof: product.socialProof,
    variants: product.variants,
  };
  const renderedAt = new Date().getTime();
  const canonicalProductUrl = new URL(
    `/${locale}/products/${product.slug}`,
    serverEnv.siteUrl,
  ).toString();
  const shareDescription = createShareDescription(product.description.html);
  const productStructuredData = createProductStructuredData(
    product,
    canonicalProductUrl,
    serverEnv.siteUrl,
  );
  const productPathname = `/products/${product.slug}`;
  const safeLoginReturnTo = getSafeInternalReturnTo(productPathname, "/");
  const listingCopy = {
    badgeLabels: {
      discount: listingT("badges.discount"),
      new: listingT("badges.new"),
      personalization: listingT("badges.personalization"),
    },
    ratingLabel: (value: string) => listingT("rating", { value }),
    reviewsLabel: (count: number) => listingT("reviews", { count }),
    unavailableLabel: listingT("unavailable"),
  };

  return (
    <Container className="main-content-spacing lg:px-15">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(productStructuredData),
        }}
      />

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
        key={`${product.id}:${cityId ?? "no-city"}`}
        availabilityByVariantId={availabilityByVariantId}
        bnplInformation={
          <ProductBnplInformation
            informationLabel={t("bnpl.informationLabel")}
            message={t("bnpl.message")}
            tabbyLabel={t("bnpl.tabbyLabel")}
            tamaraLabel={t("bnpl.tamaraLabel")}
          />
        }
        locale={locale}
        locationName={resolvedLocation?.city.name ?? city?.name ?? null}
        product={purchaseProduct}
        renderedAt={renderedAt}
        shareActions={
          <ProductShareActions
            copyFailedLabel={t("sharing.copyFailed")}
            copyLabel={t("sharing.copyLink")}
            copySuccessLabel={t("sharing.copySuccess")}
            description={shareDescription}
            productName={product.name}
            title={t("sharing.title")}
            twitterLabel={t("sharing.twitter")}
            url={canonicalProductUrl}
            whatsappLabel={t("sharing.whatsapp")}
          />
        }
        copy={{
          gallery: {
            closeLightbox: t("gallery.closeLightbox"),
            imagePositionTemplate: t.raw("gallery.imagePosition") as string,
            lightboxTitleTemplate: t.raw("gallery.lightboxTitle") as string,
            nextImage: t("gallery.nextImage"),
            openImageTemplate: t.raw("gallery.openImage") as string,
            previousImage: t("gallery.previousImage"),
            selectImageTemplate: t.raw("gallery.selectImage") as string,
          },
          panel: {
            addToCart: t("addToCart"),
            availability: {
              availableTemplate: t.raw("availability.available") as string,
              availableAtLocationTemplate: t.raw(
                "availability.availableAtLocation",
              ) as string,
              outOfStock: t("availability.outOfStock"),
              purchaseUnavailable: t("availability.purchaseUnavailable"),
              unavailableAtLocation: t("availability.unavailableAtLocation"),
              unavailableAtLocationTemplate: t.raw(
                "availability.unavailableAtLocationNamed",
              ) as string,
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
              title: t("quantity.title"),
            },
            options: {
              labels: {
                color: t("options.color"),
                size: t("options.size"),
              },
            },
            ratingLabelTemplate: t.raw("rating.label") as string,
            ratingSummaryTemplate: t.raw("rating.summary") as string,
            socialProof: {
              timesOrdered: t("socialProof.timesOrdered"),
              viewersNow: t("socialProof.viewersNow"),
            },
            skuTemplate: t.raw("sku") as string,
          },
          purchase: {
            adding: t("purchase.adding"),
            errors: {
              cartSessionFailure: t("purchase.errors.cartSessionFailure"),
              invalidInput: t("purchase.errors.invalidInput"),
              invalidPersonalization: t(
                "purchase.errors.invalidPersonalization",
              ),
              locationRequired: t("purchase.errors.locationRequired"),
              outOfStock: t("purchase.errors.outOfStock"),
              productUnavailable: t("purchase.errors.productUnavailable"),
              quantityLimitTemplate: t.raw(
                "purchase.errors.quantityLimit",
              ) as string,
              serviceUnavailable: t("purchase.errors.serviceUnavailable"),
              unavailableAtLocation: t("purchase.errors.unavailableAtLocation"),
              variantInvalid: t("purchase.errors.variantInvalid"),
            },
            sticky: {
              desktopLabel: t("purchase.sticky.desktopLabel"),
              mobileLabel: t("purchase.sticky.mobileLabel"),
            },
            success: {
              checkout: t("purchase.success.checkout"),
              close: t("purchase.success.close"),
              continueShopping: t("purchase.success.continueShopping"),
              countTemplate: t.raw("purchase.success.count") as string,
              title: t("purchase.success.title"),
              totalLabel: t("purchase.success.total"),
            },
          },
        }}
        wishlistEnabled={usesMockProductSource}
      />

      <div className="mt-10 border-t border-gray-200 pt-8 lg:mt-12 lg:pt-10">
        <ProductDescription
          description={product.description}
          title={t("descriptionTitle")}
        />
      </div>

      {relatedProducts.length > 0 ? (
        <div className="mt-10 lg:mt-12">
          <RelatedProducts
            {...listingCopy}
            locale={locale}
            products={relatedProducts}
            title={t("discovery.relatedTitle")}
          />
        </div>
      ) : null}

      {complementaryProducts.length > 0 ? (
        <div className="mt-10 pb-10 lg:mt-12 lg:pb-14">
          <ComplementaryProducts
            {...listingCopy}
            carouselLabel={t("discovery.complementaryCarouselLabel")}
            locale={locale}
            nextLabel={t("discovery.next")}
            previousLabel={t("discovery.previous")}
            products={complementaryProducts}
            title={t("discovery.complementaryTitle")}
          />
        </div>
      ) : null}

      {reviewReadResult ? (
        <div className="mt-10 lg:mt-12">
          <ProductReviewsSection
            copy={{
              aggregateTemplate: t.raw("reviews.aggregate") as string,
              empty: t("reviews.empty"),
              ratingLabelTemplate: t.raw("rating.label") as string,
              readErrorDescription: t("reviews.readError.description"),
              readErrorTitle: t("reviews.readError.title"),
              retry: t("reviews.readError.retry"),
              submission: {
                commentLabel: t("reviews.submission.commentLabel"),
                commentOptional: t("reviews.submission.commentOptional"),
                commentPlaceholder: t("reviews.submission.commentPlaceholder"),
                errors: {
                  "auth-required": t("reviews.submission.errors.authRequired"),
                  "invalid-input": t("reviews.submission.errors.invalidInput"),
                  "not-eligible": t("reviews.submission.errors.notEligible"),
                  "product-unavailable": t(
                    "reviews.submission.errors.productUnavailable",
                  ),
                  "rating-required": t(
                    "reviews.submission.errors.ratingRequired",
                  ),
                  "service-unavailable": t(
                    "reviews.submission.errors.serviceUnavailable",
                  ),
                },
                guestDescription: t("reviews.submission.guestDescription"),
                login: t("reviews.submission.login"),
                loading: t("reviews.submission.loading"),
                notVerified: t("reviews.submission.notVerified"),
                ratingLabel: t("reviews.submission.ratingLabel"),
                ratingOptionTemplate: t.raw(
                  "reviews.submission.ratingOption",
                ) as string,
                retry: t("reviews.submission.retry"),
                retrying: t("reviews.submission.retrying"),
                submit: t("reviews.submission.submit"),
                submitting: t("reviews.submission.submitting"),
                success: t("reviews.submission.success"),
                title: t("reviews.submission.title"),
                unavailable: t("reviews.submission.unavailable"),
              },
              titleTemplate: t.raw("reviews.title") as string,
            }}
            locale={locale}
            loginReturnTo={safeLoginReturnTo}
            productId={product.id}
            ratingSummary={product.ratingSummary}
            readResult={reviewReadResult}
            retryHref={productPathname}
          />
        </div>
      ) : null}
    </Container>
  );
}
