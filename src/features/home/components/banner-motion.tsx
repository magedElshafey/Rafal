"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Below-fold enhancement only. Images and links stay visible without this effect. */
export function BannerMotion({ children }: { children: ReactNode }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (
      !element ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    let wasOutsideViewport = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (!entry.isIntersecting) {
        wasOutsideViewport = true;
        return;
      }

      // Avoid animating content already being read when hydration arrives late.
      if (
        wasOutsideViewport &&
        element.dataset.bannerMotion !== "complete" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        element.dataset.bannerMotion = "entered";
      }
      observer.disconnect();
    }, { threshold: 0.12 });

    // Cancellation (including a changed motion preference) also completes the run.
    const finish = (event: AnimationEvent) => {
      if (event.animationName === "banner-promo-settle") {
        element.dataset.bannerMotion = "complete";
      }
    };
    element.addEventListener("animationend", finish);
    element.addEventListener("animationcancel", finish);
    observer.observe(element);

    return () => {
      observer.disconnect();
      element.removeEventListener("animationend", finish);
      element.removeEventListener("animationcancel", finish);
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className="motion-banner-promo"
      onFocusCapture={() => {
        if (elementRef.current) elementRef.current.dataset.bannerMotion = "complete";
      }}
    >
      {children}
    </div>
  );
}
