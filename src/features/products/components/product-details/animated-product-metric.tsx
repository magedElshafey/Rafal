"use client";

import type { Locale } from "next-intl";
import { useEffect, useRef } from "react";

type AnimatedProductMetricProps = {
  locale: Locale;
  value: number;
};

const ANIMATION_DURATION_MS = 600;

function formatMetric(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

export function AnimatedProductMetric({
  locale,
  value,
}: AnimatedProductMetricProps) {
  const visualValueRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);
  const finalValue = formatMetric(locale, value);

  useEffect(() => {
    const container = containerRef.current;
    const visualValue = visualValueRef.current;
    if (!container || !visualValue) return;

    const formatValue = (nextValue: number) =>
      formatMetric(locale, nextValue);

    visualValue.textContent = finalValue;
    if (hasAnimatedRef.current || value === 0) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      hasAnimatedRef.current = true;
      return;
    }

    let animationFrameId: number | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimatedRef.current) return;

        hasAnimatedRef.current = true;
        observer.disconnect();
        const startedAt = performance.now();

        const updateValue = (now: number) => {
          const progress = Math.min(
            1,
            (now - startedAt) / ANIMATION_DURATION_MS,
          );
          const easedProgress = 1 - (1 - progress) ** 3;
          visualValue.textContent = formatValue(
            Math.round(value * easedProgress),
          );

          if (progress < 1) {
            animationFrameId = window.requestAnimationFrame(updateValue);
          } else {
            visualValue.textContent = finalValue;
          }
        };

        visualValue.textContent = formatValue(0);
        animationFrameId = window.requestAnimationFrame(updateValue);
      },
      { threshold: 0.4 },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [finalValue, locale, value]);

  return (
    <span ref={containerRef} className="tabular-nums">
      <span className="sr-only">{finalValue}</span>
      <span ref={visualValueRef} aria-hidden="true">
        {finalValue}
      </span>
    </span>
  );
}
