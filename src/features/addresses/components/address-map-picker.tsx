"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Component, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RafalModal } from "@/components/ui/rafal-modal";
import { clientEnv } from "@/config/client-env";
import { addressCityConflict, createAddressLookup, resolveCityViewport, reverseGeocodeAddress } from "@/features/addresses/api/address-geocoding.client";
import type { AddressMapPoint, AddressMapSuggestion, CityViewport } from "@/features/addresses/types/address-map.types";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";
import { cityOptionLabel } from "@/features/location/city-option-label";
import type { City } from "@/features/location/types";

const Canvas = dynamic(() => import("./address-map-canvas").then(module => module.AddressMapCanvas), {
  ssr: false,
  loading: () => <div className="min-h-48 flex-1 rounded-md bg-gray-100" aria-busy="true" />,
});

class MapLoadBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

type Props = {
  cityId: number | null;
  disabled?: boolean;
  onCityChange: (city: City) => void;
  onSuggestion: (suggestion: AddressMapSuggestion, replace: boolean) => void;
};
type CityCache = Map<string, { until: number; viewport: CityViewport }>;
type Result = { key: string; status: "loading" | "success" | "partial" | "empty" | "outside" | "unknown" | "error" | "conflict"; suggestion?: AddressMapSuggestion };

// Mounted only inside the open modal. Closing aborts both provider lifecycles.
function PickerContent({ cityId, disabled = false, onCityChange, onSuggestion, cache, close }: Props & { cache: CityCache; close: () => void }) {
  const t = useTranslations("Common.addressMap");
  const locale = useLocale();
  const id = useId();
  const catalog = useQuery(cityCatalogQueryOptions(locale));
  const cities = catalog.data ?? [];
  const city = cities.find(item => item.id === cityId) ?? null;
  const key = `${locale}:${cityId}:${city?.name ?? ""}:${city?.regionName ?? ""}`;
  const token = clientEnv.addressMapToken;
  const [focus, setFocus] = useState<{ key: string; viewport: CityViewport | null } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [replace, setReplace] = useState(false);
  const [review, setReview] = useState(0);
  const resultRef = useRef<Result | null>(null);
  const latest = useRef({ key, city, disabled, onSuggestion });
  useLayoutEffect(() => { latest.current = { key, city, disabled, onSuggestion }; });
  const lookup = useRef<ReturnType<typeof createAddressLookup> | null>(null);
  const lastForward = useRef(0);
  const focusPending = Boolean(token && city && focus?.key !== key);
  const current = result?.key === key ? result : null;

  useEffect(() => {
    if (!city || !token) return;
    const controller = new AbortController();
    let active = true;
    const selected = city;
    const timer = setTimeout(async () => {
      try {
        const cached = cache.get(key);
        let viewport = cached && cached.until > Date.now() ? cached.viewport : null;
        if (!viewport) {
          lastForward.current = Date.now();
          viewport = await resolveCityViewport(selected, locale, token, controller.signal);
        }
        if (!active || latest.current.key !== key) return;
        if (viewport) {
          if (cache.size >= 16) cache.delete(cache.keys().next().value!);
          cache.set(key, { viewport, until: Date.now() + 5 * 60_000 });
        }
        setFocus({ key, viewport });
      } catch { if (active && latest.current.key === key) setFocus({ key, viewport: null }); }
    }, Math.max(350, 1_050 - (Date.now() - lastForward.current)));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  // Scalar key includes all catalog geography and locale; normal field edits do not refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, token, cache]);

  useEffect(() => {
    if (!token) return;
    const session = createAddressLookup(
      (point, signal) => reverseGeocodeAddress(point, locale, token, signal),
      suggestion => {
        if (latest.current.key !== key || latest.current.disabled) return;
        const status = suggestion.countryStatus === "outside" ? "outside"
          : suggestion.countryStatus === "unknown" ? "unknown"
          : addressCityConflict(latest.current.city, suggestion) ? "conflict"
          : suggestion.district && suggestion.streetDetails ? "success"
          : suggestion.district || suggestion.streetDetails ? "partial" : "empty";
        const next: Result = { key, status, suggestion };
        resultRef.current = next;
        setResult(next);
      },
      () => {
        if (latest.current.key !== key) return;
        resultRef.current = null;
        setResult({ key, status: "error" });
      },
    );
    lookup.current = session;
    return () => { session.cancel(); lookup.current = null; resultRef.current = null; };
  }, [key, locale, token]);

  const moving = useCallback(() => {
    lookup.current?.cancel();
    resultRef.current = null;
    setResult(null);
  }, []);
  const candidate = useCallback((point: AddressMapPoint) => {
    if (latest.current.disabled) return;
    if (lookup.current?.select(point)) {
      resultRef.current = null;
      setResult({ key: latest.current.key, status: "loading" });
    }
  }, []);
  const canConfirm = Boolean(current?.suggestion && ["success", "partial", "empty"].includes(current.status));
  function confirm() {
    const value = resultRef.current;
    if (!value?.suggestion || value.key !== latest.current.key || latest.current.disabled || !["success", "partial", "empty"].includes(value.status)) return;
    if (value.suggestion.district || value.suggestion.streetDetails) latest.current.onSuggestion(value.suggestion, replace);
    close();
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="mb-1 block type-label text-gray-600">{t("deliveryCity")}</label>
          <select id={id} value={cityId ?? ""} disabled={disabled || catalog.isPending || catalog.isError}
            className="h-11 w-full rounded-md border border-gray-200 bg-gray-0 px-3 type-body text-gray-1000 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={event => {
              const next = cities.find(item => item.id === Number(event.target.value));
              if (next) { moving(); setReplace(false); onCityChange(next); }
            }}>
            <option value="" disabled>{t("chooseCity")}</option>
            {cityId && !city ? <option value={cityId}>{t("cityUnavailable")}</option> : null}
            {cities.map(item => <option key={item.id} value={item.id}>{cityOptionLabel(item, cities)}</option>)}
          </select>
        </div>
      </div>
      <p role="status" className="type-caption text-gray-600">
        {catalog.isError ? t("cityUnavailable") : focusPending ? t("cityLoading") : city && focus?.key === key && !focus.viewport ? t("cityUnresolved") : t("instructions")}
      </p>
      {token ? <MapLoadBoundary fallback={<p role="status">{t("unavailable")}</p>}>
        <Canvas token={token} disabled={disabled || focusPending} label={t("mapLabel")} markerLabel={t("marker")}
          zoomIn={t("zoomIn")} zoomOut={t("zoomOut")} failureLabel={t("tileError")}
          viewport={focus?.key === key ? focus.viewport : null} review={review} onMoveStart={moving} onCandidate={candidate} />
      </MapLoadBoundary> : <p role="status" className="rounded-md bg-gray-50 p-4 type-body-sm">{t("unavailable")}</p>}
      <div className="min-w-0 space-y-2" aria-live="polite" aria-atomic="true">
        <p role="status" className="type-body-sm text-gray-600">{current ? t(current.status) : t("previewHint")}</p>
        {current?.suggestion && ["success", "partial", "empty"].includes(current.status) ? <>
          <dl className="grid gap-2 type-body-sm sm:grid-cols-2">
            <div><dt className="text-gray-500">{t("suggestedDistrict")}</dt><dd className="break-words font-medium text-gray-1000">{current.suggestion.district ?? t("completeManually")}</dd></div>
            <div><dt className="text-gray-500">{t("suggestedStreet")}</dt><dd className="break-words font-medium text-gray-1000">{current.suggestion.streetDetails ?? t("completeManually")}</dd></div>
          </dl>
          {current.suggestion.district || current.suggestion.streetDetails ? <label className="flex min-h-11 items-center gap-2 type-caption text-gray-600">
            <input type="checkbox" checked={replace} onChange={event => setReplace(event.target.checked)} className="size-4 accent-gold-500" />{t("replace")}
          </label> : null}
        </> : null}
      </div>
      <div className="flex shrink-0 gap-3 border-t border-gray-100 bg-gray-0 pt-3 pb-[env(safe-area-inset-bottom)]">
        <Button className="min-w-0 flex-1 whitespace-normal" disabled={disabled || focusPending || !token || current?.status === "loading" || ["outside", "unknown", "conflict"].includes(current?.status ?? "")}
          onClick={canConfirm ? confirm : () => setReview(value => value + 1)}>
          {canConfirm ? current?.status === "empty" ? t("confirmManual") : t("confirm") : current?.status === "loading" ? t("loading") : t("review")}
        </Button>
        <Button variant="outline" onClick={close}>{t("cancel")}</Button>
      </div>
      <p className="type-caption text-gray-500">{t("privacy")} <a href="https://locationiq.com" className="underline">LocationIQ</a></p>
    </>
  );
}

export function AddressMapPicker(props: Props) {
  const t = useTranslations("Common.addressMap");
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [cache] = useState<CityCache>(() => new Map());
  return <div className="min-w-0 sm:col-span-2">
    <Button ref={trigger} variant="outline" disabled={props.disabled} aria-haspopup="dialog" onClick={() => setOpen(true)}>{t("open")}</Button>
    <RafalModal open={open} onOpenChange={setOpen} title={t("title")} description={t("subtitle")} returnFocusRef={trigger}
      bodyClassName="flex min-h-0 flex-1 flex-col gap-3 space-y-0"
      className="flex h-[100dvh] flex-col rounded-none px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:h-[94dvh] sm:max-h-[94dvh] sm:max-w-4xl sm:rounded-xl">
      {open ? <PickerContent {...props} cache={cache} close={() => setOpen(false)} /> : null}
    </RafalModal>
  </div>;
}
