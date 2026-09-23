"use client";

import type { Locale } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { LocationSelector } from "@/components/shared/LocationSelector";
import { setGuestCityId } from "@/features/location/actions/set-guest-city";
import { CitySelectionDialog } from "@/features/location/components/CitySelectionDialog";
import type { City, Coordinates, LocationSource } from "@/features/location/types";
import { useRouter } from "@/i18n/navigation";

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
  locale: Locale;
  source: LocationSource;
  onLocationPersisted?: () => void | Promise<void>;
};

const cityCatalogRequests = new Map<string, Promise<City[]>>();

async function loadCityCatalog(locale: Locale, source: LocationSource) {
  const requestKey = `${source}:${locale}`;
  const cachedRequest = cityCatalogRequests.get(requestKey);
  if (cachedRequest) return cachedRequest;

  const request = import("@/features/location/services/city-service").then(
    ({ cityService }) => cityService.listCities(locale, source),
  );
  cityCatalogRequests.set(requestKey, request);

  try {
    return await request;
  } catch (error) {
    cityCatalogRequests.delete(requestKey);
    throw error;
  }
}

async function findCityFromCoordinates(
  coordinates: Coordinates,
  locale: Locale,
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
  source,
  onLocationPersisted,
}: LocationControllerProps) {
  const [cities, setCities] = useState<City[] | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity);
  const [isOpen, setIsOpen] = useState(initialCity === null);
  const [cityLoadFailed, setCityLoadFailed] = useState(false);
  const [geolocationState, setGeolocationState] = useState<
    "idle" | "loading" | "error"
  >("idle");
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

    loadCityCatalog(locale, source).then(
      (nextCities) => {
        if (mountedRef.current) setCities(nextCities);
      },
      () => {
        if (mountedRef.current) setCityLoadFailed(true);
      },
    );
  }, [cities, cityLoadFailed, isOpen, locale, source]);

  const isRequired = selectedCity === null;

  const handleSelect = (city: City) => {
    if (!city.isAvailable) return;

    setSelectedCity(city);
    setIsOpen(false);
    setGeolocationState("idle");
    startTransition(async () => {
      await setGuestCityId(city.id);
      await onLocationPersisted?.();
      router.refresh();
    });
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
          canUseCurrentLocation={source === "mock"}
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
