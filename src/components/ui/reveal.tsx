"use client";

import { type ComponentPropsWithoutRef, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type RevealProps = ComponentPropsWithoutRef<"div">;

export function Reveal({ children, className, ...props }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;

    if (
      !element ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        if (entry.isIntersecting) {
          element.dataset.revealState = "visible";
          observer.disconnect();
          return;
        }

        if (!element.dataset.revealState) {
          element.dataset.revealState = "prepared";
        }
      },
      { rootMargin: "160px 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={elementRef} className={cn("motion-reveal", className)} {...props}>
      {children}
    </div>
  );
}
