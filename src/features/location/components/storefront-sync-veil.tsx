"use client";

import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";

import { shouldShowStorefrontSyncVeil } from "@/features/location/city-transition-state";
import { useBrowsingCity } from "@/features/location/components/browsing-city-provider";

export function StorefrontSyncVeil() {
  const { status, statusMessage } = useBrowsingCity();

  if (!shouldShowStorefrontSyncVeil(status)) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-40 flex items-start justify-center bg-gray-0/50 px-4 pt-6 motion-safe:animate-[surface-overlay-in_var(--motion-duration-fast)_var(--motion-ease-out)_both]"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-0/95 px-3 py-2 type-body-sm font-medium text-gray-700">
        <CircleNotchIcon
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
        />
        <span>{statusMessage}</span>
      </div>
    </div>
  );
}
