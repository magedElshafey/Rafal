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
// padding, 1440px cap; equal desktop columns with a 2rem / 3rem gap.
const PRIMARY_SIZES =
  "(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 672px, (max-width: 1279px) calc(50vw - 4.75rem), (max-width: 1439px) calc(50vw - 5.25rem), 636px";

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
    <div className="flex min-h-12 items-center justify-between gap-3 px-1 pt-2">
      <IconButton
        data-gallery-control
        aria-label={copy.previousImage}
        onClick={() => selectRelativeImage(-1)}
        size="md"
        variant="media"
      >
        <PreviousIcon aria-hidden="true" />
      </IconButton>
      <p
        aria-live={announce ? "polite" : "off"}
        aria-atomic="true"
        className="min-w-20 text-center type-body-sm text-gray-600"
      >
        <span className="sr-only">{position(selectedImageIndex)}</span>
        <bdi dir="ltr" aria-hidden="true">{selectedImageIndex + 1} / {images.length}</bdi>
      </p>
      <IconButton
        data-gallery-control
        aria-label={copy.nextImage}
        onClick={() => selectRelativeImage(1)}
        size="md"
        variant="media"
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
      className="mx-auto w-full min-w-0 max-w-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-w-none"
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
              frameClassName="rounded-lg bg-gray-50"
            />
            <span className="absolute end-3 bottom-3 inline-flex size-10 items-center justify-center rounded-full border border-border bg-gray-0 text-gray-700 transition-colors duration-[var(--motion-duration-fast)] group-hover:border-gold-500 motion-reduce:transition-none">
              <EyeIcon aria-hidden="true" className="size-4" />
            </span>
          </button>
          {navigation(false)}
          {canNavigate ? (
            <ul
              ref={thumbnailsRef}
              className="mt-2 flex max-w-full gap-3 overflow-x-auto overscroll-x-contain p-1"
            >
              {images.map((image, index) => {
                const isSelected = image.id === selectedImage.id;
                return (
                  <li key={image.id} className="w-16 shrink-0 sm:w-20">
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
                        sizes="(max-width: 639px) 60px, 76px"
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
        variant="image-viewer"
        title={formatProductMessage(copy.lightboxTitleTemplate, {
          image: selectedImage?.alt ?? productName,
        })}
      >
        <div dir={direction} className="flex h-full min-h-0 flex-col">
          {/* Reserve a toolbar row so Close and position never cover the media. */}
          <div className="flex h-12 shrink-0 items-center pe-16">
            {selectedImage && canNavigate ? (
              <p
                aria-live="polite"
                aria-atomic="true"
                className="rounded-full border border-gray-200 bg-gray-0 px-4 py-2 type-body-sm text-gray-900 tabular-nums"
              >
                <span className="sr-only">{position(selectedImageIndex)}</span>
                <bdi dir="ltr" aria-hidden="true">
                  {selectedImageIndex + 1} / {images.length}
                </bdi>
              </p>
            ) : null}
          </div>
          {selectedImage ? (
            <div
              data-gallery-control
              tabIndex={0}
              aria-label={position(selectedImageIndex)}
              className="relative mt-2 min-h-0 flex-1 rounded-lg pb-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-16 sm:pb-0"
            >
              <AppImage
                key={selectedImage.src}
                src={selectedImage.src}
                alt={selectedImage.alt}
                aspectRatio="auto"
                fit="contain"
                sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1279px) calc(100vw - 14rem), 1120px"
                frameClassName="h-full w-full rounded-md bg-transparent"
              />
              {canNavigate ? (
                <>
                  <IconButton
                    data-gallery-control
                    aria-label={copy.previousImage}
                    onClick={() => selectRelativeImage(-1)}
                    size="md"
                    variant="media"
                    className="absolute start-1 bottom-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2"
                  >
                    <PreviousIcon aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    data-gallery-control
                    aria-label={copy.nextImage}
                    onClick={() => selectRelativeImage(1)}
                    size="md"
                    variant="media"
                    className="absolute end-1 bottom-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2"
                  >
                    <NextIcon aria-hidden="true" />
                  </IconButton>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </RafalModal>
    </section>
  );
}
