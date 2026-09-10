"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
} from "react";

import { IconButton, type IconButtonProps } from "@/components/ui/icon-button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type CarouselDirection = "ltr" | "rtl";
type CarouselAlign = "start" | "center" | "end";

type AppCarouselContextValue = {
  canScrollNext: boolean;
  canScrollPrevious: boolean;
  direction: CarouselDirection;
  reducedMotion: boolean;
  scrollNext: () => void;
  scrollPrevious: () => void;
  scrollTo: (index: number) => void;
  selectedIndex: number;
  snapCount: number;
  viewportRef: ReturnType<typeof useEmblaCarousel>[0];
};

const AppCarouselContext = createContext<AppCarouselContextValue | null>(null);

function useAppCarousel() {
  const context = useContext(AppCarouselContext);

  if (!context) {
    throw new Error("AppCarousel components must be used within AppCarousel.");
  }

  return context;
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}

type AppCarouselProps = ComponentPropsWithoutRef<"section"> & {
  align?: CarouselAlign;
  autoplay?: boolean;
  direction: CarouselDirection;
  dragFree?: boolean;
  draggable?: boolean;
  label: string;
  loop?: boolean;
  slidesToScroll?: number | "auto";
};

function AppCarouselRoot({
  align = "start",
  autoplay = false,
  children,
  className,
  direction,
  dragFree = false,
  draggable = true,
  label,
  loop = false,
  onKeyDown,
  slidesToScroll = 1,
  ...props
}: AppCarouselProps) {
  const options = useMemo(
    () => ({
      align,
      direction,
      dragFree,
      loop,
      slidesToScroll,
      watchDrag: draggable,
    }),
    [align, direction, dragFree, draggable, loop, slidesToScroll],
  );
  const autoplayPlugin = useMemo(
    () =>
      autoplay
        ? Autoplay({
            playOnInit: false,
            rootNode: (emblaRoot) =>
              emblaRoot.closest<HTMLElement>(
                '[aria-roledescription="carousel"]',
              ),
            stopOnFocusIn: true,
            stopOnInteraction: true,
          })
        : undefined,
    [autoplay],
  );
  const plugins = useMemo(
    () => (autoplayPlugin ? [autoplayPlugin] : []),
    [autoplayPlugin],
  );
  const [viewportRef, api] = useEmblaCarousel(options, plugins);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const shouldReduceMotion = reducedMotion ?? true;

  useEffect(() => {
    const autoplayApi = api?.plugins().autoplay;

    if (!autoplayApi) return;

    if (reducedMotion === false) autoplayApi.play();
    else autoplayApi.stop();

    return () => autoplayApi.stop();
  }, [api, reducedMotion]);

  const updateState = useCallback(() => {
    if (!api) return;

    setSelectedIndex(api.selectedScrollSnap());
    setSnapCount(api.scrollSnapList().length);
    setCanScrollPrevious(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;

    api.on("select", updateState);
    api.on("reInit", updateState);
    const animationFrame = requestAnimationFrame(updateState);

    return () => {
      cancelAnimationFrame(animationFrame);
      api.off("select", updateState);
      api.off("reInit", updateState);
    };
  }, [api, updateState]);

  const scrollPrevious = useCallback(
    () => api?.scrollPrev(shouldReduceMotion),
    [api, shouldReduceMotion],
  );
  const scrollNext = useCallback(
    () => api?.scrollNext(shouldReduceMotion),
    [api, shouldReduceMotion],
  );
  const scrollTo = useCallback(
    (index: number) => api?.scrollTo(index, shouldReduceMotion),
    [api, shouldReduceMotion],
  );

  const contextValue = useMemo(
    () => ({
      canScrollNext,
      canScrollPrevious,
      direction,
      reducedMotion: shouldReduceMotion,
      scrollNext,
      scrollPrevious,
      scrollTo,
      selectedIndex,
      snapCount,
      viewportRef,
    }),
    [
      canScrollNext,
      canScrollPrevious,
      direction,
      shouldReduceMotion,
      scrollNext,
      scrollPrevious,
      scrollTo,
      selectedIndex,
      snapCount,
      viewportRef,
    ],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (direction === "rtl") scrollNext();
      else scrollPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (direction === "rtl") scrollPrevious();
      else scrollNext();
    }
  };

  return (
    <AppCarouselContext.Provider value={contextValue}>
      <section
        {...props}
        aria-label={label}
        aria-roledescription="carousel"
        className={cn(
          "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
        dir={direction}
        role="region"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {children}
      </section>
    </AppCarouselContext.Provider>
  );
}

type AppCarouselViewportProps = ComponentPropsWithoutRef<"div">;

const AppCarouselViewport = forwardRef<
  HTMLDivElement,
  AppCarouselViewportProps
>(({ className, ...props }, forwardedRef) => {
  const { viewportRef } = useAppCarousel();

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef(node);
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef, viewportRef],
  );

  return (
    <div
      ref={setRefs}
      className={cn("overflow-hidden", className)}
      {...props}
    />
  );
});

AppCarouselViewport.displayName = "AppCarousel.Viewport";

const AppCarouselContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex touch-pan-y", className)} {...props} />
));

AppCarouselContent.displayName = "AppCarousel.Content";

type AppCarouselSlideProps = ComponentPropsWithoutRef<"div"> & {
  label?: string;
};

const AppCarouselSlide = forwardRef<HTMLDivElement, AppCarouselSlideProps>(
  ({ className, label, ...props }, ref) => (
    <div
      ref={ref}
      aria-label={label}
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0", className)}
      role="group"
      {...props}
    />
  ),
);

AppCarouselSlide.displayName = "AppCarousel.Slide";

type CarouselButtonProps = Omit<IconButtonProps, "aria-label"> & {
  label: string;
};

function AppCarouselPrevious({
  children,
  disabled,
  label,
  ...props
}: CarouselButtonProps) {
  const { canScrollPrevious, direction, scrollPrevious } = useAppCarousel();
  const Icon = direction === "rtl" ? ChevronRightIcon : ChevronLeftIcon;

  return (
    <IconButton
      {...props}
      aria-label={label}
      disabled={disabled || !canScrollPrevious}
      onClick={scrollPrevious}
    >
      {children ?? <Icon />}
    </IconButton>
  );
}

function AppCarouselNext({
  children,
  disabled,
  label,
  ...props
}: CarouselButtonProps) {
  const { canScrollNext, direction, scrollNext } = useAppCarousel();
  const Icon = direction === "rtl" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <IconButton
      {...props}
      aria-label={label}
      disabled={disabled || !canScrollNext}
      onClick={scrollNext}
    >
      {children ?? <Icon />}
    </IconButton>
  );
}

type AppCarouselDotsProps = ComponentPropsWithoutRef<"div"> & {
  dotClassName?: string;
  dotLabels: readonly string[];
  label: string;
  selectedDotClassName?: string;
};

function AppCarouselDots({
  className,
  dotClassName,
  dotLabels,
  label,
  selectedDotClassName,
  ...props
}: AppCarouselDotsProps) {
  const { scrollTo, selectedIndex, snapCount } = useAppCarousel();

  if (snapCount <= 1) return null;

  return (
    <div
      {...props}
      aria-label={label}
      className={cn("flex items-center justify-center gap-2", className)}
      role="group"
    >
      {Array.from({ length: snapCount }, (_, index) => {
        const selected = index === selectedIndex;

        return (
          <button
            key={index}
            type="button"
            aria-current={selected ? "true" : undefined}
            aria-label={dotLabels[index]}
            aria-pressed={selected}
            className={cn(
              "relative size-2 rounded-full bg-gray-0/60 transition-[width,background-color] after:pointer-events-none after:absolute after:left-1/2 after:top-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-0 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1000 motion-reduce:transition-none",
              dotClassName,
              selected && "w-6 bg-gray-0",
              selected && selectedDotClassName,
            )}
            onClick={() => scrollTo(index)}
          />
        );
      })}
    </div>
  );
}

export {
  AppCarouselRoot as AppCarousel,
  AppCarouselContent,
  AppCarouselDots,
  AppCarouselNext,
  AppCarouselPrevious,
  AppCarouselSlide,
  AppCarouselViewport,
};
export type {
  AppCarouselDotsProps,
  AppCarouselProps,
  AppCarouselSlideProps,
  AppCarouselViewportProps,
  CarouselButtonProps,
};
