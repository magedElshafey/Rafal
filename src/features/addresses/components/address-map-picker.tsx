"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Component, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/config/client-env";
import { createAddressLookup, reverseGeocodeAddress } from "@/features/addresses/api/address-geocoding.client";
import type { AddressMapPoint, AddressMapSuggestion } from "@/features/addresses/types/address-map.types";

const Canvas = dynamic(() => import("./address-map-canvas").then(module => module.AddressMapCanvas), {
  ssr: false,
  loading: () => <div className="h-80 rounded-md bg-gray-100" aria-busy="true" />,
});

class MapLoadBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function AddressMapPicker({ cityId, disabled = false, onSuggestion }: {
  cityId: number | null;
  disabled?: boolean;
  onSuggestion: (suggestion: AddressMapSuggestion, replace: boolean) => void;
}) {
  const t = useTranslations("Common.addressMap");
  const locale = useLocale();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ cityId: number | null; status: "loading" | "success" | "partial" | "empty" | "outside" | "unknown" | "error"; suggestion?: AddressMapSuggestion } | null>(null);
  const latest = useRef({ onSuggestion, disabled, cityId });
  useLayoutEffect(() => { latest.current = { onSuggestion, disabled, cityId }; });
  const lookup = useRef<ReturnType<typeof createAddressLookup> | null>(null);
  const token = clientEnv.addressMapToken;
  useEffect(() => {
    if (!open || !token || disabled) return;
    const session = createAddressLookup(
      (point, signal) => reverseGeocodeAddress(point, locale, token, signal),
      suggestion => {
        if (latest.current.disabled || latest.current.cityId !== cityId) return;
        const hasFields = Boolean(suggestion.district || suggestion.streetDetails);
        const status = suggestion.countryStatus === "outside" ? "outside"
          : suggestion.countryStatus === "unknown" ? "unknown"
          : suggestion.district && suggestion.streetDetails ? "success"
          : hasFields ? "partial" : "empty";
        setResult({ cityId, status, suggestion });
        if (hasFields) latest.current.onSuggestion(suggestion, false);
      },
      () => { if (latest.current.cityId === cityId) setResult({ cityId, status: "error" }); },
    );
    lookup.current = session;
    return () => { session.cancel(); lookup.current = null; };
  }, [open, token, cityId, locale, disabled]);
  const select = useCallback((point: AddressMapPoint) => {
    if (lookup.current?.select(point)) setResult({ cityId, status: "loading" });
  }, [cityId]);
  const current = result?.cityId === cityId ? result : null;

  return (
    <div className="min-w-0 sm:col-span-2">
      <Button ref={trigger} variant="outline" disabled={disabled} aria-expanded={open} aria-controls={id}
        onClick={() => { setOpen(value => !value); setResult(null); }}>{open ? t("close") : t("open")}</Button>
      {open ? (
        <section id={id} aria-label={t("title")} className="mt-4 min-w-0 rounded-md border border-gray-200 p-3">
          <p className="mb-3 type-body-sm text-gray-600">{t("instructions")}</p>
          {token ? (
            <MapLoadBoundary fallback={<p role="status">{t("unavailable")}</p>}>
              <Canvas token={token} disabled={disabled} label={t("title")} centerLabel={t("useCenter")}
                markerLabel={t("marker")} zoomIn={t("zoomIn")} zoomOut={t("zoomOut")}
                northLabel={t("north")} southLabel={t("south")} eastLabel={t("east")} westLabel={t("west")}
                failureLabel={t("unavailable")} onSelect={select} />
            </MapLoadBoundary>
          ) : <p role="status">{t("unavailable")}</p>}
          <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 type-body-sm">
            {current ? t(current.status) : t("manualCity")}
          </p>
          {current?.suggestion && (current.suggestion.district || current.suggestion.streetDetails) ? (
            <div className="mt-3 space-y-2">
              <p className="type-body-sm">{t("suggestedDistrict")}: {current.suggestion.district ?? t("missing")}</p>
              <p className="type-body-sm">{t("suggestedStreet")}: {current.suggestion.streetDetails ?? t("missing")}</p>
              <Button variant="outline" disabled={disabled} className="h-auto min-h-11 whitespace-normal py-2"
                onClick={() => latest.current.onSuggestion(current.suggestion!, true)}>{t("replace")}</Button>
            </div>
          ) : null}
          <p className="mt-3 type-caption text-gray-600">{t("privacy")} <a className="underline" href="https://locationiq.com">Search by LocationIQ.com</a> · <a className="underline" href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a></p>
          <Button variant="ghost" className="mt-2" onClick={() => { setOpen(false); setResult(null); trigger.current?.focus(); }}>{t("close")}</Button>
        </section>
      ) : null}
    </div>
  );
}
