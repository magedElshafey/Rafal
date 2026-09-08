import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

const DEFAULT_FALLBACK_SRC = "/images/editorial-placeholder.svg";

type AppImageProps = Omit<ImageProps, "alt" | "fill" | "src"> & {
  alt: string;
  aspectRatio?: string;
  fallbackSrc?: ImageProps["src"];
  fit?: "contain" | "cover";
  frameClassName?: string;
  src?: ImageProps["src"] | null;
};

export function AppImage({
  alt,
  aspectRatio = "16 / 9",
  className,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  fit = "cover",
  frameClassName,
  sizes,
  src,
  ...props
}: AppImageProps) {
  return (
    <span
      className={cn("relative block overflow-hidden bg-gray-100", frameClassName)}
      style={{ aspectRatio }}
    >
      <Image
        {...props}
        fill
        alt={alt}
        sizes={sizes ?? "100vw"}
        src={src ?? fallbackSrc}
        className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      />
    </span>
  );
}

