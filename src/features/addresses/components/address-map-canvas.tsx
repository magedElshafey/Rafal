"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./address-map-canvas.module.css";
import type { AddressMapPoint } from "@/features/addresses/types/address-map.types";
import { Button } from "@/components/ui/button";

type Props = {
  token: string;
  disabled: boolean;
  label: string;
  centerLabel: string;
  markerLabel: string;
  zoomIn: string;
  zoomOut: string;
  failureLabel: string;
  northLabel: string;
  southLabel: string;
  eastLabel: string;
  westLabel: string;
  onSelect: (point: AddressMapPoint) => void;
};

export const AddressMapCanvas = memo(function AddressMapCanvas(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const latest = useRef(props);
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => { latest.current = props; });

  useEffect(() => {
    if (!container.current) return;
    let resize: ResizeObserver | undefined;
    let instance: L.Map | undefined;
    let failureTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      instance = L.map(container.current, {
        // Riyadh overview, not a coordinate inferred from a selected Laravel city.
        center: [24.7136, 46.6753], zoom: 11, zoomControl: false,
        minZoom: 6, maxZoom: 18,
        // Saudi operating-region navigation envelope, NOT a national-border test.
        maxBounds: [[16, 34], [33, 56]], maxBoundsViscosity: 1,
        scrollWheelZoom: false, dragging: !L.Browser.touch, touchZoom: true,
        zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
        inertia: false,
      });
      map.current = instance;
      const tiles = L.tileLayer("https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=" + encodeURIComponent(props.token), {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a href="https://locationiq.com">LocationIQ</a>',
      }).addTo(instance);
      tiles.on("tileerror", () => setFailed(true));
      tiles.on("tileload", () => setFailed(false));
      const select = (point: L.LatLng) => {
        if (latest.current.disabled || !map.current) return;
        if (!marker.current) {
          marker.current = L.marker(point, {
            draggable: true, keyboard: true, title: latest.current.markerLabel, alt: latest.current.markerLabel,
            icon: L.divIcon({ className: styles.marker, html: '<span aria-hidden="true"></span>', iconSize: [28, 28], iconAnchor: [14, 28] }),
          }).addTo(map.current);
          marker.current.on("dragend", () => {
            const position = marker.current?.getLatLng();
            if (position && !latest.current.disabled) latest.current.onSelect({ lat: position.lat, lng: position.lng });
          });
        } else marker.current.setLatLng(point);
        latest.current.onSelect({ lat: point.lat, lng: point.lng });
      };
      instance.on("click", (event: L.LeafletMouseEvent) => select(event.latlng));
      instance.on("address-center", () => { if (map.current) select(map.current.getCenter()); });
      resize = new ResizeObserver(() => instance?.invalidateSize({ animate: false, pan: false }));
      resize.observe(container.current);
    } catch { failureTimer = setTimeout(() => setFailed(true), 0); }
    return () => {
      resize?.disconnect();
      clearTimeout(failureTimer);
      marker.current?.off();
      marker.current = null;
      instance?.off();
      instance?.remove();
      map.current = null;
    };
  }, [props.token]);

  return (
    <div className={styles.root}>
      <div ref={container} dir="ltr" role="region" aria-label={props.label} className={styles.canvas} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" disabled={props.disabled} onClick={() => map.current?.zoomIn()} aria-label={props.zoomIn}>+</Button>
        <Button variant="outline" disabled={props.disabled} onClick={() => map.current?.zoomOut()} aria-label={props.zoomOut}>−</Button>
        <Button variant="outline" disabled={props.disabled} onClick={() => map.current?.fire("address-center")}>{props.centerLabel}</Button>
      </div>
      <div dir="ltr" className="mt-2 flex flex-wrap gap-2">
        <Button variant="outline" disabled={props.disabled} aria-label={props.westLabel} onClick={() => map.current?.panBy([-128, 0], { animate: false })}>←</Button>
        <Button variant="outline" disabled={props.disabled} aria-label={props.northLabel} onClick={() => map.current?.panBy([0, -128], { animate: false })}>↑</Button>
        <Button variant="outline" disabled={props.disabled} aria-label={props.southLabel} onClick={() => map.current?.panBy([0, 128], { animate: false })}>↓</Button>
        <Button variant="outline" disabled={props.disabled} aria-label={props.eastLabel} onClick={() => map.current?.panBy([128, 0], { animate: false })}>→</Button>
      </div>
      {failed ? <p role="status" className="mt-2 type-body-sm text-destructive">{props.failureLabel}</p> : null}
    </div>
  );
});
