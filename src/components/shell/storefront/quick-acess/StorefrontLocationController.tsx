"use client";

import type { Locale } from "next-intl";

import {
  LocationController,
  type LocationControllerCopy,
} from "@/features/location/components/LocationController";

type StorefrontLocationControllerProps = {
  copy: LocationControllerCopy;
  locale: Locale;
};

export function StorefrontLocationController({
  copy,
  locale,
}: StorefrontLocationControllerProps) {
  return (
    <LocationController
      copy={copy}
      locale={locale}
    />
  );
}
