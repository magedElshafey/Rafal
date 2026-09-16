import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { ProductDescription } from "@/features/products/components/product-details/product-description";
import { ProductGallery } from "@/features/products/components/product-details/product-gallery";
import { ProductPurchasePanel } from "@/features/products/components/product-details/product-purchase-panel";
import { getProductDetailsBySlug } from "@/features/products/server/product-boundary";
import { getDefaultProductVariant } from "@/features/products/utils/get-default-product-variant";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const [product, t] = await Promise.all([
    getProductDetailsBySlug(slug, locale),
    getTranslations({
      locale,
      namespace: "Common.productDetails",
    }),
  ]);

  if (!product) notFound();

  const defaultVariant = getDefaultProductVariant(product);

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

      <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12 rtl:lg:flex-row-reverse">
        <div className="min-w-0 lg:w-[44%]">
          <ProductGallery product={product} variant={defaultVariant} />
        </div>
        <div className="min-w-0 flex-1">
          <ProductPurchasePanel
            locale={locale}
            product={product}
            variant={defaultVariant}
          />
        </div>
      </div>

      <div className="mt-10 border-t border-gray-200 pt-8 lg:mt-12 lg:pt-10">
        <ProductDescription
          description={product.description}
          title={t("descriptionTitle")}
        />
      </div>
    </Container>
  );
}
