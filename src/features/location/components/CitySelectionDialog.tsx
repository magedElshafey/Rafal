"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckIcon,
  MapPinIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/icons";
import type { City } from "@/features/location/types";
import { cn } from "@/lib/utils";

type CitySelectionDialogProps = {
  cities: City[];
  copy: {
    title: string;
    description: string;
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
  geolocationState: "idle" | "loading" | "error";
  isLoading: boolean;
  isOpen: boolean;
  isRequired: boolean;
  selectedCityId?: string;
  onClose: () => void;
  onSelect: (city: City) => void;
  onUseCurrentLocation: () => void;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function CitySelectionDialog({
  cities,
  copy,
  geolocationState,
  isLoading,
  isOpen,
  isRequired,
  onClose,
  onSelect,
  onUseCurrentLocation,
  selectedCityId,
}: CitySelectionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeCityId, setActiveCityId] = useState<string | undefined>(
    selectedCityId,
  );
  const titleId = "city-selection-title";
  const descriptionId = "city-selection-description";
  const listboxId = "city-selection-options";

  const filteredCities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return cities;

    return cities.filter((city) =>
      city.name.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [cities, query]);

  const availableCities = filteredCities.filter((city) => city.isAvailable);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstControl = dialogRef.current?.querySelector<HTMLElement>(
      FOCUSABLE_SELECTOR,
    );
    (firstControl ?? dialogRef.current)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isLoading) return;
    searchRef.current?.focus();
  }, [isLoading, isOpen]);

  if (!isOpen) return null;

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!isRequired) onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const controls = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    );
    if (controls.length === 0) {
      event.preventDefault();
      return;
    }

    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleComboboxKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (availableCities.length === 0) return;

    const activeIndex = availableCities.findIndex(
      (city) => city.id === activeCityId,
    );

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex =
        activeIndex < 0 ? 0 : (activeIndex + 1) % availableCities.length;
      setActiveCityId(availableCities[nextIndex].id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        activeIndex <= 0 ? availableCities.length - 1 : activeIndex - 1;
      setActiveCityId(availableCities[nextIndex].id);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      onSelect(availableCities[activeIndex]);
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isRequired && event.target === event.currentTarget) onClose();
  };

  const hasNoSearchResults =
    !isLoading && cities.length > 0 && filteredCities.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-1000/50 p-0 sm:items-center sm:p-6"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-lg bg-gray-0 p-6 text-gray-1000 sm:max-w-md sm:rounded-lg"
      >
        {!isRequired ? (
          <button
            type="button"
            aria-label={copy.close}
            onClick={onClose}
            className="absolute end-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon size={18} />
          </button>
        ) : null}

        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-gold-50 text-gold-700">
            <MapPinIcon size={24} />
          </span>
          <div className="space-y-2">
            <h2 id={titleId} className="text-h3 font-medium">
              {copy.title}
            </h2>
            <p id={descriptionId} className="type-body text-gray-600">
              {copy.description}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="md"
          className="mb-4 w-full"
          loading={geolocationState === "loading"}
          loadingLabel={copy.geolocationLoading}
          onClick={onUseCurrentLocation}
        >
          <MapPinIcon size={18} />
          {copy.useCurrentLocation}
        </Button>

        {geolocationState === "error" ? (
          <p role="alert" className="mb-3 type-caption text-destructive">
            {copy.geolocationError}
          </p>
        ) : null}

        <div aria-live="polite" aria-busy={isLoading || undefined}>
          {isLoading ? (
            <p className="py-8 text-center type-body text-gray-600">
              {copy.loading}
            </p>
          ) : cities.length === 0 ? (
            <p className="py-8 text-center type-body text-gray-600">
              {copy.empty}
            </p>
          ) : (
            <>
              <div className="relative mb-2">
                <SearchIcon
                  size={18}
                  className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <label htmlFor="city-search" className="sr-only">
                  {copy.searchLabel}
                </label>
                <Input
                  ref={searchRef}
                  id="city-search"
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded="true"
                  aria-activedescendant={
                    activeCityId ? `${listboxId}-${activeCityId}` : undefined
                  }
                  value={query}
                  placeholder={copy.searchPlaceholder}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveCityId(undefined);
                  }}
                  onKeyDown={handleComboboxKeyDown}
                  className="ps-10"
                />
              </div>

              <div
                id={listboxId}
                role="listbox"
                aria-label={copy.searchLabel}
                className="max-h-60 overflow-y-auto overscroll-contain rounded-md border border-gray-200"
              >
                {hasNoSearchResults ? (
                  <div
                    role="option"
                    aria-disabled="true"
                    aria-selected="false"
                    className="px-4 py-8 text-center type-body text-gray-600"
                  >
                    {copy.searchNoResults}
                  </div>
                ) : (
                  filteredCities.map((city) => {
                    const selected = city.id === selectedCityId;
                    const active = city.id === activeCityId;

                    return (
                      <button
                        key={city.id}
                        id={`${listboxId}-${city.id}`}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-disabled={!city.isAvailable}
                        disabled={!city.isAvailable}
                        onMouseEnter={() =>
                          city.isAvailable && setActiveCityId(city.id)
                        }
                        onClick={() => onSelect(city)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-start type-body last:border-b-0",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          active && "bg-gray-50",
                          selected && "bg-gold-50",
                          !city.isAvailable &&
                            "cursor-not-allowed text-gray-400",
                        )}
                      >
                        <span>{city.name}</span>
                        {city.isAvailable ? (
                          selected ? (
                            <CheckIcon size={18} className="text-gold-700" />
                          ) : null
                        ) : (
                          <span className="type-caption">{copy.unavailable}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
