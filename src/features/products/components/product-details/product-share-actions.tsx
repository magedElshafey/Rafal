"use client";

import { useEffect, useState } from "react";

import { IconButton, iconButtonVariants } from "@/components/ui/icon-button";
import {
  CheckIcon,
  CopyIcon,
  WhatsAppIcon,
  XBrandIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type ProductShareActionsProps = {
  copyFailedLabel: string;
  copyLabel: string;
  copySuccessLabel: string;
  description: string;
  productName: string;
  title: string;
  twitterLabel: string;
  url: string;
  whatsappLabel: string;
};

export function ProductShareActions({
  copyFailedLabel,
  copyLabel,
  copySuccessLabel,
  description,
  productName,
  title,
  twitterLabel,
  url,
  whatsappLabel,
}: ProductShareActionsProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const productSummary = [productName, description].filter(Boolean).join("\n\n");
  const whatsappText = [productSummary, url].filter(Boolean).join("\n\n");
  const twitterText =
    productSummary.length > 220
      ? `${productSummary.slice(0, 219).trimEnd()}…`
      : productSummary;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(url)}`;

  useEffect(() => {
    if (copyStatus === "idle") return;

    const timeoutId = window.setTimeout(() => setCopyStatus("idle"), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [copyStatus]);

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("error");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <section aria-labelledby="product-sharing-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="product-sharing-title"
          className="type-label text-gray-600"
        >
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={whatsappLabel}
            title={whatsappLabel}
            className={cn(
              iconButtonVariants({ size: "lg", variant: "ghost" }),
              "border border-gray-200 bg-gray-0",
            )}
          >
            <WhatsAppIcon className="size-5" />
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={twitterLabel}
            title={twitterLabel}
            className={cn(
              iconButtonVariants({ size: "lg", variant: "ghost" }),
              "border border-gray-200 bg-gray-0 text-gray-900",
            )}
          >
            <XBrandIcon className="size-4" />
          </a>
          <IconButton
            onClick={handleCopy}
            aria-label={copyLabel}
            title={copyLabel}
            size="lg"
            variant="ghost"
            className="border border-gray-200 bg-gray-0 text-gray-700"
          >
            {copyStatus === "success" ? (
              <CheckIcon aria-hidden="true" className="text-success" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mt-2 min-h-4 type-caption text-gray-500"
      >
        {copyStatus === "success"
          ? copySuccessLabel
          : copyStatus === "error"
            ? copyFailedLabel
            : null}
      </p>
    </section>
  );
}
