import { AppImage } from "@/components/ui/app-image";
import { ProductWishlistAction } from "@/features/wishlist/components/product-wishlist-action";
import type {
  ProductDetails,
  ProductImage,
  ProductVariant,
} from "@/features/products/types/product-details.types";

type ProductGalleryProps = {
  product: ProductDetails;
  variant: ProductVariant;
};

function getMainImage(
  product: ProductDetails,
  variant: ProductVariant,
): ProductImage {
  const variantImageId = variant.imageIds[0];
  const image = variantImageId
    ? product.images.find((candidate) => candidate.id === variantImageId)
    : product.images[0];

  if (!image) {
    throw new Error(
      `Product "${product.id}" does not have an image for its default variant.`,
    );
  }

  return image;
}

export function ProductGallery({ product, variant }: ProductGalleryProps) {
  const mainImage = getMainImage(product, variant);
  const orderedImages = [
    mainImage,
    ...product.images.filter((image) => image.id !== mainImage.id),
  ];

  return (
    <section className="min-w-0" aria-label={product.name}>
      <div className="relative">
        <AppImage
          src={mainImage.src}
          alt={mainImage.alt}
          aspectRatio="1 / 1"
          sizes="(max-width: 1023px) calc(100vw - 2rem), 42vw"
          preload
          frameClassName="rounded-lg"
        />
        <ProductWishlistAction
          productId={product.id}
          className="start-4 top-4 size-12 [&_svg]:size-6"
        />
      </div>

      {product.images.length > 1 ? (
        <ul className="mt-4 flex max-w-full gap-3 overflow-x-auto pb-1">
          {orderedImages.map((image) => {
            const isMainImage = image.id === mainImage.id;

            return (
              <li
                key={image.id}
                className="w-22 shrink-0 sm:w-26 lg:w-30"
              >
                <AppImage
                  src={image.src}
                  alt={image.alt}
                  aspectRatio="1 / 1"
                  sizes="120px"
                  loading="lazy"
                  frameClassName={
                    isMainImage
                      ? "rounded-md border-2 border-gold-500"
                      : "rounded-md border border-gray-200"
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
