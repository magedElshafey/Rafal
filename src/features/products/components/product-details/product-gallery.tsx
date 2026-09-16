import { AppImage } from "@/components/ui/app-image";
import type { ProductImage } from "@/features/products/types/product-details.types";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import { ProductWishlistAction } from "@/features/wishlist/components/product-wishlist-action";

type ProductGalleryProps = {
  copy: {
    selectImageTemplate: string;
  };
  images: readonly ProductImage[];
  initialImageId: string;
  onSelectImage: (imageId: string) => void;
  productId: string;
  productName: string;
  selectedImageId: string;
};

export function ProductGallery({
  copy,
  images,
  initialImageId,
  onSelectImage,
  productId,
  productName,
  selectedImageId,
}: ProductGalleryProps) {
  const selectedImage = images.find((image) => image.id === selectedImageId);

  if (!selectedImage) {
    throw new Error(
      `Product "${productId}" selected unknown image "${selectedImageId}".`,
    );
  }

  return (
    <section className="min-w-0" aria-label={productName}>
      <div className="relative">
        <AppImage
          src={selectedImage.src}
          alt={selectedImage.alt}
          aspectRatio="1 / 1"
          sizes="(max-width: 1023px) calc(100vw - 2rem), 42vw"
          preload={selectedImage.id === initialImageId}
          frameClassName="rounded-lg"
        />
        <ProductWishlistAction
          productId={productId}
          className="start-4 top-4 size-12 [&_svg]:size-6"
        />
      </div>

      {images.length > 1 ? (
        <ul className="mt-4 flex max-w-full gap-3 overflow-x-auto pb-1">
          {images.map((image) => {
            const isSelected = image.id === selectedImage.id;

            return (
              <li key={image.id} className="w-22 shrink-0 sm:w-26 lg:w-30">
                <button
                  type="button"
                  aria-label={formatProductMessage(copy.selectImageTemplate, {
                    image: image.alt,
                  })}
                  aria-pressed={isSelected}
                  onClick={() => onSelectImage(image.id)}
                  className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <AppImage
                    src={image.src}
                    alt={image.alt}
                    aspectRatio="1 / 1"
                    sizes="120px"
                    loading="lazy"
                    frameClassName={
                      isSelected
                        ? "rounded-md border-2 border-gold-500"
                        : "rounded-md border border-gray-200"
                    }
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
