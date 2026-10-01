"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

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
import {
  getGalleryArrowOffset,
  getRelativeGalleryIndex,
  resolveGalleryImageId,
} from "@/features/products/utils/product-gallery";

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
  productName: string;
  selectedImageId: string | null;
};

// PDP Container: 2rem mobile / 3rem tablet padding, 7.5rem desktop
// padding, 1440px cap; the gallery occupies 44% of its content width.
const PRIMARY_SIZES =
  "(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(100vw - 3rem), (max-width: 1439px) calc(44vw - 3.3rem), 581px";

export function ProductGallery({
  copy,
  direction,
  images,
  initialImageId,
  onSelectImage,
  productName,
  selectedImageId,
}: ProductGalleryProps) {
  const galleryRef = useRef<HTMLElement>(null);
  const lightboxTriggerRef = useRef<HTMLButtonElement>(null);
  const thumbnailsRef = useRef<HTMLUListElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Freeze the initial resource, not a variant-dependent ID that may change.
  const [initialImageSrc] = useState(
    () => images.find((image) => image.id === initialImageId)?.src ?? images[0]?.src,
  );
  const validId = resolveGalleryImageId(
    images,
    selectedImageId,
    initialImageId ? [initialImageId] : [],
  );
  const selectedImageIndex = images.findIndex((image) => image.id === validId);
  const selectedImage = images[selectedImageIndex];
  const canNavigate = images.length > 1;

  // Keep the modal owner mounted through an empty-media transition so Radix
  // can finish its exit and restore focus to the persistent gallery section.
  if (!selectedImage && lightboxOpen) setLightboxOpen(false);

  useEffect(() => {
    const strip = thumbnailsRef.current;
    const selected = strip?.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]',
    );
    if (!strip || !selected) return;
    const viewport = strip.getBoundingClientRect();
    const thumbnail = selected.getBoundingClientRect();
    const delta =
      thumbnail.left < viewport.left
        ? thumbnail.left - viewport.left
        : thumbnail.right > viewport.right
          ? thumbnail.right - viewport.right
          : 0;
    // Scroll only this strip, never the PDP or a modal ancestor. No motion even
    // if the document has smooth scrolling enabled; signed deltas work in RTL.
    if (delta) strip.scrollBy({ left: delta, behavior: "instant" });
  }, [selectedImageIndex, images]);

  const selectRelativeImage = (offset: number, focusThumbnail = false) => {
    const index = getRelativeGalleryIndex(
      selectedImageIndex,
      offset,
      images.length,
    );
    const image = images[index];
    if (!image) return;
    onSelectImage(image.id);
    if (focusThumbnail) {
      thumbnailsRef.current?.querySelectorAll<HTMLButtonElement>("button")[index]
        ?.focus({ preventScroll: true });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      !canNavigate ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !(event.target instanceof HTMLElement)
    ) return;
    // React portal events bubble through this gallery owner. Include the modal
    // Close button (Radix's initial focus), without listening across the page.
    const inLightbox = lightboxOpen && event.target.closest('[role="dialog"]');
    if (!event.currentTarget.contains(event.target) && !inLightbox) return;
    if (
      !event.target.closest("[data-gallery-control]") &&
      !(inLightbox && event.target.closest("button"))
    ) return;
    const offset = getGalleryArrowOffset(event.key, direction);
    if (!offset) return;
    event.preventDefault();
    event.stopPropagation();
    selectRelativeImage(
      offset,
      event.target.hasAttribute("data-gallery-thumbnail"),
    );
  };

  const PreviousIcon = direction === "rtl" ? ChevronRightIcon : ChevronLeftIcon;
  const NextIcon = direction === "rtl" ? ChevronLeftIcon : ChevronRightIcon;
  const position = (index: number) =>
    formatProductMessage(copy.imagePositionTemplate, {
      current: index + 1,
      total: images.length,
    });
  const navigation = (announce: boolean) => canNavigate ? (
    <div className="mt-4 flex items-center justify-center gap-4">
      <IconButton
        data-gallery-control
        aria-label={copy.previousImage}
        onClick={() => selectRelativeImage(-1)}
        size="lg"
        variant="outline"
      >
        <PreviousIcon aria-hidden="true" />
      </IconButton>
      <p
        aria-live={announce ? "polite" : "off"}
        aria-atomic="true"
        className="min-w-20 text-center type-body-sm text-gray-600"
      >
        {position(selectedImageIndex)}
      </p>
      <IconButton
        data-gallery-control
        aria-label={copy.nextImage}
        onClick={() => selectRelativeImage(1)}
        size="lg"
        variant="outline"
      >
        <NextIcon aria-hidden="true" />
      </IconButton>
    </div>
  ) : null;

  return (
    <section
      ref={galleryRef}
      dir={direction}
      tabIndex={-1}
      className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={productName}
      onKeyDown={handleKeyDown}
    >
      {selectedImage ? (
        <>
          <button
            ref={lightboxTriggerRef}
            data-gallery-control
            type="button"
            aria-haspopup="dialog"
            aria-label={`${formatProductMessage(copy.openImageTemplate, { image: selectedImage.alt })} — ${position(selectedImageIndex)}`}
            className="group relative block w-full cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setLightboxOpen(true)}
          >
            <AppImage
              key={selectedImage.src}
              src={selectedImage.src}
              alt={selectedImage.alt}
              aspectRatio="1 / 1"
              fit="contain"
              sizes={PRIMARY_SIZES}
              preload={selectedImage.src === initialImageSrc}
              frameClassName="rounded-lg"
            />
            <span className="absolute end-4 bottom-4 inline-flex size-11 items-center justify-center rounded-full bg-gray-0/90 text-gray-900 shadow-[var(--shadow-product-card-wishlist)] transition-opacity group-hover:opacity-90 motion-reduce:transition-none">
              <EyeIcon aria-hidden="true" className="size-5" />
            </span>
          </button>
          {navigation(false)}
          {canNavigate ? (
            <ul
              ref={thumbnailsRef}
              className="mt-4 flex max-w-full gap-3 overflow-x-auto overscroll-x-contain p-1"
            >
              {images.map((image, index) => {
                const isSelected = image.id === selectedImage.id;
                return (
                  <li key={image.id} className="w-22 shrink-0 sm:w-26 lg:w-30">
                    <button
                      type="button"
                      data-gallery-control
                      data-gallery-thumbnail
                      aria-label={`${formatProductMessage(copy.selectImageTemplate, { image: image.alt })} — ${position(index)}`}
                      aria-pressed={isSelected}
                      onClick={() => onSelectImage(image.id)}
                      className={`relative block w-full overflow-hidden rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isSelected ? "border-gold-500" : "border-gray-200"}`}
                    >
                      <AppImage
                        src={image.src}
                        alt=""
                        aspectRatio="1 / 1"
                        fit="contain"
                        sizes="(max-width: 639px) 84px, (max-width: 1023px) 100px, 116px"
                        loading="lazy"
                      />
                      <span
                        aria-hidden="true"
                        className={`absolute end-1 bottom-1 rounded-sm px-1 type-body-sm ${isSelected ? "bg-gray-1000 font-bold text-gray-0 underline" : "bg-gray-0/90 text-gray-900"}`}
                      >
                        {index + 1}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : (
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-400">
          <ImageIcon aria-hidden="true" className="size-14" />
        </div>
      )}

      <RafalModal
        open={lightboxOpen && !!selectedImage}
        onOpenChange={setLightboxOpen}
        closeLabel={copy.closeLightbox}
        showClose
        returnFocusRef={selectedImage ? lightboxTriggerRef : galleryRef}
        className="sm:max-w-5xl"
        title={formatProductMessage(copy.lightboxTitleTemplate, {
          image: selectedImage?.alt ?? productName,
        })}
      >
        {/* Extend media past the title's reserved Close-button gutter. */}
        <div dir={direction} className="-me-8">
          {selectedImage ? (
            <div
              data-gallery-control
              tabIndex={0}
              aria-label={position(selectedImageIndex)}
              className="mt-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AppImage
                key={selectedImage.src}
                src={selectedImage.src}
                alt={selectedImage.alt}
                aspectRatio="1 / 1"
                fit="contain"
                sizes="(max-width: 639px) min(calc(100vw - 3rem), 75dvh), min(calc(100vw - 5rem), 75dvh, 976px)"
                frameClassName="mx-auto w-full max-w-[min(75dvh,100%)] rounded-lg"
              />
            </div>
          ) : null}
          {selectedImage ? navigation(true) : null}
        </div>
      </RafalModal>
    </section>
  );
}
