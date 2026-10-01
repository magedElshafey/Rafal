"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { observeProductImageIntent } from "./product-image-intent";

type MediaState = "idle" | "loading" | "ready" | "failed";

export function ProductSecondaryMedia({
  children,
  src,
  sizes,
}: {
  children: ReactNode;
  src: string;
  sizes: string;
}) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MediaState>("idle");

  useEffect(() => {
    if (state !== "idle") return;
    // The link's ::after covers the card. Media cannot receive its pointer events.
    const link = mediaRef.current
      ?.closest(".product-card")
      ?.querySelector<HTMLAnchorElement>(".product-card-link");
    if (!link) return;

    return observeProductImageIntent(link, () => setState("loading"));
  }, [state]);

  return (
    <div
      ref={mediaRef}
      className="pointer-events-none absolute inset-0"
      data-secondary-state={state}
    >
      {children}
      {state === "loading" || state === "ready" ? (
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          sizes={sizes}
          loading="lazy"
          className="product-card-image product-card-secondary-image object-cover"
          onLoad={() => setState((current) => current === "loading" ? "ready" : current)}
          onError={() => setState("failed")}
        />
      ) : null}
    </div>
  );
}
