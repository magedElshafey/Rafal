"use client";

import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useState } from "react";

import { LocationSelector } from "@/components/shared/LocationSelector";
import { CityPickerDialog } from "@/components/ui/city-picker-dialog";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";
import { useBrowsingCity } from "@/features/location/components/browsing-city-provider";
import type { City } from "@/features/location/types";

export type LocationControllerCopy = {
  deliveryLabel: string;
  selectCity: string;
  changeLocation: string;
  dialogTitle: string;
  dialogDescription: string;
  loading: string;
  empty: string;
  close: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchNoResults: string;
};

type LocationControllerProps = {
  copy: LocationControllerCopy;
  locale: Locale;
};

export function LocationController({
  copy,
  locale,
}: LocationControllerProps) {
  const { committedCity, isChanging, selectCity, status, statusMessage } =
    useBrowsingCity();
  const [isOpen, setIsOpen] = useState(committedCity === null);
  const citiesQuery = useQuery({
    ...cityCatalogQueryOptions(locale),
    enabled: isOpen,
  });

  const handleSelect = (city: City) => {
    if (city.id === committedCity?.id || selectCity(city)) setIsOpen(false);
  };

  const handleOpen = () => {
    if (isChanging) return;
    setIsOpen(true);
  };

  return (
    <div className="min-w-0">
      <LocationSelector
        city={committedCity?.name ?? copy.selectCity}
        deliveryLabel={copy.deliveryLabel}
        accessibilityLabel={copy.changeLocation}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-busy={isChanging}
        aria-disabled={isChanging || undefined}
        onClick={handleOpen}
      />
      {isOpen ? (
        <CityPickerDialog
          cities={citiesQuery.data ?? []}
          copy={{
            title: copy.dialogTitle,
            description: copy.dialogDescription,
            loading: copy.loading,
            empty: copy.empty,
            close: copy.close,
            searchLabel: copy.searchLabel,
            searchPlaceholder: copy.searchPlaceholder,
            searchNoResults: copy.searchNoResults,
          }}
          isLoading={citiesQuery.isPending}
          isOpen
          selectedCityId={committedCity?.id}
          onClose={() => {
            if (!isChanging) setIsOpen(false);
          }}
          onSelect={handleSelect}
        />
      ) : null}
      <p
        aria-hidden="true"
        className={`mt-1 min-h-4 type-caption ${status === "failed" ? "text-destructive" : "text-gray-500"}`}
      >
        {statusMessage || "\u00a0"}
      </p>
    </div>
  );
}
