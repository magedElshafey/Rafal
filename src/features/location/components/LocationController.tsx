"use client";

import type { Locale } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { LocationSelector } from "@/components/shared/LocationSelector";
import { setGuestCityId } from "@/features/location/actions/set-guest-city";
import { getCitiesClient } from "@/features/location/api/location-api.client";
import { CitySelectionDialog } from "@/features/location/components/CitySelectionDialog";
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

const cityCatalogRequests = new Map<Locale, Promise<readonly City[]>>();

async function loadCityCatalog(locale: Locale) {
  const cachedRequest = cityCatalogRequests.get(locale);
  if (cachedRequest) return cachedRequest;

  const request = getCitiesClient(locale);
  cityCatalogRequests.set(locale, request);

  try {
    return await request;
  } catch (error) {
    cityCatalogRequests.delete(locale);
    throw error;
  }
}

export function LocationController({
  copy,
  initialCity,
  locale,
  onLocationPersisted,
}: LocationControllerProps) {
  const [cities, setCities] = useState<readonly City[] | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity);
  const [isOpen, setIsOpen] = useState(initialCity === null);
  const [cityLoadFailed, setCityLoadFailed] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || cities !== null || cityLoadFailed) return;

    loadCityCatalog(locale).then(
      (nextCities) => {
        if (mountedRef.current) setCities(nextCities);
      },
      () => {
        if (mountedRef.current) setCityLoadFailed(true);
      },
    );
  }, [cities, cityLoadFailed, isOpen, locale]);

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
    setCityLoadFailed(false);
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
        <CitySelectionDialog
          cities={cities ?? []}
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
          isLoading={cities === null && !cityLoadFailed}
          isOpen
          selectedCityId={selectedCity?.id}
          onClose={() => setIsOpen(false)}
          onSelect={handleSelect}
        />
      ) : null}
    </>
  );
}
