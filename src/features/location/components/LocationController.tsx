"use client";

import { useEffect, useRef, useState } from "react";

import { LocationSelector } from "@/components/shared/LocationSelector";
import { CitySelectionDialog } from "@/features/location/components/CitySelectionDialog";
import type { City, CityLocale, Coordinates } from "@/features/location/types";
import { writeGuestCityId } from "@/features/location/utils/guest-location-session";

export type LocationControllerCopy = {
  deliveryLabel: string;
  selectCity: string;
  changeLocation: string;
  dialogTitle: string;
  dialogDescription: string;
  loading: string;
  empty: string;
  unavailable: string;
  close: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchNoResults: string;
  useCurrentLocation: string;
  geolocationLoading: string;
  geolocationError: string;
};

type LocationControllerProps = {
  copy: LocationControllerCopy;
  initialCity: City | null;
  locale: CityLocale;
};

const cityCatalogRequests = new Map<CityLocale, Promise<City[]>>();

async function loadCityCatalog(locale: CityLocale) {
  const cachedRequest = cityCatalogRequests.get(locale);
  if (cachedRequest) return cachedRequest;

  const request = import("@/features/location/services/city-service").then(
    ({ cityService }) => cityService.listCities(locale),
  );
  cityCatalogRequests.set(locale, request);

  try {
    return await request;
  } catch (error) {
    cityCatalogRequests.delete(locale);
    throw error;
  }
}

async function findCityFromCoordinates(
  coordinates: Coordinates,
  locale: CityLocale,
) {
  const { cityService } = await import(
    "@/features/location/services/city-service"
  );
  return cityService.findCityByCoordinates(coordinates, locale);
}

export function LocationController({
  copy,
  initialCity,
  locale,
}: LocationControllerProps) {
  const [cities, setCities] = useState<City[] | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity);
  const [isOpen, setIsOpen] = useState(initialCity === null);
  const [cityLoadFailed, setCityLoadFailed] = useState(false);
  const [geolocationState, setGeolocationState] = useState<
    "idle" | "loading" | "error"
  >("idle");
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

  const isRequired = selectedCity === null;

  const handleSelect = (city: City) => {
    if (!city.isAvailable) return;

    writeGuestCityId(city.id);
    setSelectedCity(city);
    setIsOpen(false);
    setGeolocationState("idle");
  };

  const handleOpen = () => {
    setCityLoadFailed(false);
    setGeolocationState("idle");
    setIsOpen(true);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeolocationState("error");
      return;
    }

    setGeolocationState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        findCityFromCoordinates(
          { latitude: coords.latitude, longitude: coords.longitude },
          locale,
        ).then(
          (city) => {
            if (!mountedRef.current) return;
            if (city?.isAvailable) handleSelect(city);
            else setGeolocationState("error");
          },
          () => {
            if (mountedRef.current) setGeolocationState("error");
          },
        );
      },
      () => {
        if (mountedRef.current) setGeolocationState("error");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
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
            unavailable: copy.unavailable,
            close: copy.close,
            searchLabel: copy.searchLabel,
            searchPlaceholder: copy.searchPlaceholder,
            searchNoResults: copy.searchNoResults,
            useCurrentLocation: copy.useCurrentLocation,
            geolocationLoading: copy.geolocationLoading,
            geolocationError: copy.geolocationError,
          }}
          isLoading={cities === null && !cityLoadFailed}
          isOpen
          isRequired={isRequired}
          selectedCityId={selectedCity?.id}
          geolocationState={geolocationState}
          onClose={() => setIsOpen(false)}
          onSelect={handleSelect}
          onUseCurrentLocation={handleUseCurrentLocation}
        />
      ) : null}
    </>
  );
}
