"use client";

import dynamic from "next/dynamic";

import type { MapPin } from "../utils/destination-page";

// Mismo alto que el canvas: evita CLS mientras carga Leaflet (solo cliente).
const MAP_HEIGHT = "h-[320px] sm:h-[420px]";

const DestinationMapCanvas = dynamic(() => import("./destination-map-canvas"), {
  ssr: false,
  loading: () => <div className={`${MAP_HEIGHT} rounded-card bg-sand`} />,
});

export function DestinationMap({
  pins,
  label,
  route,
  zoom,
}: {
  pins: MapPin[];
  label?: string;
  route?: boolean;
  zoom?: number;
}) {
  return <DestinationMapCanvas pins={pins} label={label} route={route} zoom={zoom} />;
}
