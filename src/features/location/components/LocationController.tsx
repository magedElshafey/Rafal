"use client";

import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useState, useTransition } from "react";

import { LocationSelector } from "@/components/shared/LocationSelector";
import { CityPickerDialog } from "@/components/ui/city-picker-dialog";
import { setGuestCityId } from "@/features/location/actions/set-guest-city";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";
import type { City } from "@/features/location/types";
import { useRouter } from "@/i18n/navigation";

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
  initialCity: City | null;
  locale: Locale;
  onLocationPersisted?: () => void | Promise<void>;
};

export function LocationController({
  copy,
  initialCity,
  locale,
  onLocationPersisted,
}: LocationControllerProps) {
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity);
  const [isOpen, setIsOpen] = useState(initialCity === null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const citiesQuery = useQuery({
    ...cityCatalogQueryOptions(locale),
    enabled: isOpen,
  });

  const handleSelect = (city: City) => {
    setSelectedCity(city);
    setIsOpen(false);
    startTransition(async () => {
      await setGuestCityId(city.id);
      await onLocationPersisted?.();
      router.refresh();
    });
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <>
      <LocationSelector
        city={selectedCity?.name ?? copy.selectCity}
        deliveryLabel={copy.deliveryLabel}
        accessibilityLabel={copy.changeLocation}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
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
          selectedCityId={selectedCity?.id}
          onClose={() => setIsOpen(false)}
          onSelect={handleSelect}
        />
      ) : null}
    </>
  );
}
