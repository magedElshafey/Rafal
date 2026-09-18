"use client";

import { useEffect, useState } from "react";

type ProductShareActionsProps = {
  copyFailedLabel: string;
  copyLabel: string;
  copySuccessLabel: string;
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
  productName,
  title,
  twitterLabel,
  url,
  whatsappLabel,
}: ProductShareActionsProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const shareText = `${productName} ${url}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(productName)}&url=${encodeURIComponent(url)}`;

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
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="product-sharing-title" className="text-h4 font-bold">
          {title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full border border-gray-200 px-4 type-body-sm font-medium text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {whatsappLabel}
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full border border-gray-200 px-4 type-body-sm font-medium text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {twitterLabel}
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-11 items-center rounded-full border border-gray-200 px-4 type-body-sm font-medium text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {copyLabel}
          </button>
        </div>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 type-caption text-gray-500">
        {copyStatus === "success"
          ? copySuccessLabel
          : copyStatus === "error"
            ? copyFailedLabel
            : null}
      </p>
    </section>
  );
}
