"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";

// Mismas constantes que el mapa de Destino (D16).
// ponytail: duplicadas; con un tercer mapa, extraer a components/shared/ y migrar Destino.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Pin del tablero: SVG 40x50, accent con trazo blanco.
const PIN_SVG =
  '<svg width="40" height="50" viewBox="0 0 40 50" aria-hidden="true"><path d="M20 2C10.6 2 3 9.4 3 18.6 3 31 20 48 20 48s17-17 17-29.4C37 9.4 29.4 2 20 2Z" fill="#C2410C" stroke="#fff" stroke-width="3"/><circle cx="20" cy="18.5" r="6" fill="#fff"/></svg>';

const pinIcon = L.divIcon({
  html: PIN_SVG,
  className: "",
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  tooltipAnchor: [0, -50],
});

// Zoom de Leaflet a 44 px (objetivo táctil mínimo); `!` gana a leaflet.css.
const ZOOM_44 =
  "[&_.leaflet-control-zoom_a]:h-11! [&_.leaflet-control-zoom_a]:w-11! [&_.leaflet-control-zoom_a]:leading-[44px]!";
const TOOLTIP_INK =
  "bg-ink! text-white! border-ink! font-semibold before:border-t-ink!";

export default function MeetingPointMapCanvas({
  lat,
  lng,
  label,
  time,
}: {
  lat: number;
  lng: number;
  label: string;
  time: string;
}) {
  // Solo cliente (ssr: false): leer matchMedia en el inicializador es seguro.
  const [animate] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <div
      role="region"
      aria-label={`Mapa del punto de encuentro: ${label}`}
      className={`isolate h-full min-h-[270px] overflow-hidden rounded-card sm:min-h-[400px] ${ZOOM_44}`}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        zoomAnimation={animate}
        fadeAnimation={animate}
        markerZoomAnimation={animate}
        className="h-full min-h-[inherit] w-full"
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
        <Marker position={[lat, lng]} icon={pinIcon} title={label} keyboard>
          <Tooltip permanent direction="top" className={TOOLTIP_INK}>
            Te esperamos aquí · {time}
          </Tooltip>
        </Marker>
      </MapContainer>
    </div>
  );
}
