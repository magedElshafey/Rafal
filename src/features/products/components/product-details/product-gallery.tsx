"use client";

import { useEffect, useRef, useState } from "react";

import { AppImage } from "@/components/ui/app-image";
import { IconButton } from "@/components/ui/icon-button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  ImageIcon,
} from "@/components/ui/icons";
import { RafalModal } from "@/components/ui/rafal-modal";
import type { ProductImage } from "@/features/products/types/product-details.types";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import { ProductWishlistAction } from "@/features/wishlist/components/product-wishlist-action";

type ProductGalleryProps = {
  copy: {
    closeLightbox: string;
    imagePositionTemplate: string;
    lightboxTitleTemplate: string;
    nextImage: string;
    openImageTemplate: string;
    previousImage: string;
    selectImageTemplate: string;
  };
  direction: "ltr" | "rtl";
  images: readonly ProductImage[];
  initialImageId: string | null;
  onSelectImage: (imageId: string) => void;
  productId: string;
  productName: string;
  selectedImageId: string | null;
  wishlistEnabled: boolean;
};

export function ProductGallery({
  copy,
  direction,
  images,
  initialImageId,
  onSelectImage,
  productId,
  productName,
  selectedImageId,
  wishlistEnabled,
}: ProductGalleryProps) {
  const lightboxTriggerRef = useRef<HTMLButtonElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const selectedImageIndex = images.findIndex(
    (image) => image.id === selectedImageId,
  );
  const selectedImage = images[selectedImageIndex];
  const canNavigate = images.length > 1;

  useEffect(() => {
    if (!lightboxOpen || !canNavigate) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      const offset =
        event.key === "ArrowRight"
          ? direction === "rtl"
            ? -1
            : 1
          : direction === "rtl"
            ? 1
            : -1;
      const nextIndex =
        (selectedImageIndex + offset + images.length) % images.length;
      const nextImage = images[nextIndex];
      if (nextImage) onSelectImage(nextImage.id);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canNavigate,
    direction,
    images,
    lightboxOpen,
    onSelectImage,
    selectedImageIndex,
  ]);

  if (!selectedImage && images.length > 0) {
    throw new Error(
      `Product "${productId}" selected unknown image "${selectedImageId}".`,
    );
  }

  if (!selectedImage) {
    return (
      <section className="min-w-0" aria-label={productName}>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center text-gray-400"
          >
            <ImageIcon className="size-14" />
          </div>
          {wishlistEnabled ? (
            <ProductWishlistAction
              productId={productId}
              className="start-4 top-4 size-12 [&_svg]:size-6"
            />
          ) : null}
        </div>
      </section>
    );
  }

  const selectRelativeImage = (offset: number) => {
    const nextIndex =
      (selectedImageIndex + offset + images.length) % images.length;
    const nextImage = images[nextIndex];
    if (nextImage) onSelectImage(nextImage.id);
  };

  const PreviousIcon = direction === "rtl" ? ChevronRightIcon : ChevronLeftIcon;
  const NextIcon = direction === "rtl" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <section className="min-w-0" aria-label={productName}>
      <div className="relative">
        <button
          ref={lightboxTriggerRef}
          type="button"
          aria-label={formatProductMessage(copy.openImageTemplate, {
            image: selectedImage.alt,
          })}
          className="group relative block w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setLightboxOpen(true)}
        >
          <AppImage
            src={selectedImage.src}
            alt={selectedImage.alt}
            aspectRatio="1 / 1"
            sizes="(max-width: 1023px) calc(100vw - 2rem), 42vw"
            preload={selectedImage.id === initialImageId}
            frameClassName="rounded-lg"
          />
          <span className="absolute end-4 bottom-4 inline-flex size-11 items-center justify-center rounded-full bg-gray-0/90 text-gray-900 shadow-[var(--shadow-product-card-wishlist)] transition-opacity group-hover:opacity-90 motion-reduce:transition-none">
            <EyeIcon aria-hidden="true" className="size-5" />
          </span>
        </button>
        {wishlistEnabled ? (
          <ProductWishlistAction
            productId={productId}
            className="start-4 top-4 size-12 [&_svg]:size-6"
          />
        ) : null}
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

      <RafalModal
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        closeLabel={copy.closeLightbox}
        showClose
        returnFocusRef={lightboxTriggerRef}
        className="sm:max-w-5xl"
        title={formatProductMessage(copy.lightboxTitleTemplate, {
          image: selectedImage.alt,
        })}
      >
        <div className="mt-4">
          <AppImage
            src={selectedImage.src}
            alt={selectedImage.alt}
            aspectRatio="1 / 1"
            fit="contain"
            sizes="(max-width: 639px) calc(100vw - 3rem), 70vh"
            frameClassName="mx-auto w-full max-w-[min(70dvh,100%)] rounded-lg"
          />

          <div
            className="mt-4 flex items-center justify-center gap-4"
            dir={direction}
          >
            {canNavigate ? (
              <IconButton
                aria-label={copy.previousImage}
                onClick={() => selectRelativeImage(-1)}
                size="md"
                variant="outline"
              >
                <PreviousIcon aria-hidden="true" />
              </IconButton>
            ) : null}
            <p
              aria-live="polite"
              className="min-w-20 text-center type-body-sm text-gray-600"
            >
              {formatProductMessage(copy.imagePositionTemplate, {
                current: selectedImageIndex + 1,
                total: images.length,
              })}
            </p>
            {canNavigate ? (
              <IconButton
                aria-label={copy.nextImage}
                onClick={() => selectRelativeImage(1)}
                size="md"
                variant="outline"
              >
                <NextIcon aria-hidden="true" />
              </IconButton>
            ) : null}
          </div>
        </div>
      </RafalModal>
    </section>
  );
}
