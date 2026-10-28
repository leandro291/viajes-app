"use client";

import dynamic from "next/dynamic";

// Mismo alto que el canvas: evita CLS mientras carga Leaflet (solo cliente).
const MAP_HEIGHT = "h-full min-h-[270px] sm:min-h-[400px]";

const MeetingPointMapCanvas = dynamic(() => import("./meeting-point-map-canvas"), {
  ssr: false,
  loading: () => <div className={`${MAP_HEIGHT} rounded-card bg-sand`} />,
});

export function MeetingPointMap(props: {
  lat: number;
  lng: number;
  label: string;
  time: string;
}) {
  return <MeetingPointMapCanvas {...props} />;
}
