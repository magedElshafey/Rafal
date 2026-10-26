"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./address-map-canvas.module.css";
import type { AddressMapPoint, CityViewport } from "@/features/addresses/types/address-map.types";
import { Button } from "@/components/ui/button";

type Props = {
  token: string;
  disabled: boolean;
  label: string;
  markerLabel: string;
  zoomIn: string;
  zoomOut: string;
  failureLabel: string;
  viewport: CityViewport | null;
  review: number;
  onMoveStart: () => void;
  onCandidate: (point: AddressMapPoint) => void;
};

export const AddressMapCanvas = memo(function AddressMapCanvas(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const latest = useRef(props);
  const suppress = useRef(false);
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => { latest.current = props; });

  useEffect(() => {
    if (!container.current) return;
    let instance: L.Map | undefined;
    let resize: ResizeObserver | undefined;
    let active = true;
    let failureTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      instance = L.map(container.current, {
        // Neutral Saudi overview until a catalog city resolves, never a guessed city.
        center: [24, 45], zoom: 6, zoomControl: false, minZoom: 6, maxZoom: 18,
        maxBounds: [[16, 34], [33, 56]], maxBoundsViscosity: 1,
        dragging: true, touchZoom: true, doubleClickZoom: true, keyboard: true,
        scrollWheelZoom: true, zoomAnimation: false, fadeAnimation: false,
        markerZoomAnimation: false, inertia: false,
      });
      map.current = instance;
      const tiles = L.tileLayer("https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=" + encodeURIComponent(props.token), {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a href="https://locationiq.com">LocationIQ</a>',
      }).addTo(instance);
      tiles.on("tileerror", () => { if (active) setFailed(true); });
      tiles.on("tileload", () => { if (active) setFailed(false); });
      instance.on("movestart", () => { if (!suppress.current) latest.current.onMoveStart(); });
      instance.on("moveend", () => {
        if (suppress.current || latest.current.disabled || !map.current) return;
        const position = map.current.getCenter();
        latest.current.onCandidate({ lat: position.lat, lng: position.lng });
      });
      resize = new ResizeObserver(() => {
        if (!instance) return;
        const center = instance.getCenter();
        suppress.current = true;
        instance.invalidateSize({ animate: false, pan: false });
        // Preview content and orientation can resize the canvas. Keep the pin
        // over the candidate whose result is shown, without another lookup.
        instance.setView(center, instance.getZoom(), { animate: false });
        suppress.current = false;
      });
      resize.observe(container.current);
    } catch { failureTimer = setTimeout(() => { if (active) setFailed(true); }, 0); }
    return () => {
      active = false;
      clearTimeout(failureTimer);
      resize?.disconnect();
      instance?.off();
      instance?.remove();
      map.current = null;
    };
  }, [props.token]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !props.viewport) return;
    suppress.current = true;
    const { center, bounds } = props.viewport;
    if (bounds) instance.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: [24, 24], maxZoom: 12, animate: false });
    else instance.setView([center.lat, center.lng], 12, { animate: false });
    suppress.current = false;
  }, [props.viewport]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    for (const handler of [instance.dragging, instance.touchZoom, instance.doubleClickZoom, instance.scrollWheelZoom, instance.keyboard]) {
      if (props.disabled) handler.disable(); else handler.enable();
    }
  }, [props.disabled]);

  useEffect(() => {
    if (!props.review || !map.current || latest.current.disabled) return;
    const position = map.current.getCenter();
    latest.current.onCandidate({ lat: position.lat, lng: position.lng });
  }, [props.review]);

  return (
    <div className={styles.root}>
      <div ref={container} dir="ltr" role="region" aria-label={props.label} className={styles.canvas} />
      <div className={styles.pin} role="img" aria-label={props.markerLabel}><span /></div>
      <div className={styles.zoom}>
        <Button variant="outline" disabled={props.disabled} onClick={() => map.current?.zoomIn()} aria-label={props.zoomIn}>+</Button>
        <Button variant="outline" disabled={props.disabled} onClick={() => map.current?.zoomOut()} aria-label={props.zoomOut}>−</Button>
      </div>
      {failed ? <p role="status" className={styles.tileError}>{props.failureLabel}</p> : null}
    </div>
  );
});
