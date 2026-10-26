"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import type { MapPin } from "../utils/destination-page";

// Q3: proveedor de tiles intercambiable cambiando solo esta constante (y la atribución).
// CARTO pasó a exigir API key (devuelve un cartel "API KEY REQUIRED"); se usa OSM, sin clave.
// ponytail: la política de OSM limita el uso intensivo; pasar a un proveedor con clave si crece el tráfico.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const MARKER_CLASS =
  "flex items-center justify-center rounded-full bg-white text-center text-sm leading-8 font-semibold text-ink shadow-card";

function pinIcon(n: number) {
  return L.divIcon({
    html: `<span>${n}</span>`,
    className: MARKER_CLASS,
    iconSize: [32, 32],
  });
}

export default function DestinationMapCanvas({ pins }: { pins: MapPin[] }) {
  // Solo cliente (ssr: false): leer matchMedia en el inicializador es seguro.
  const [animate] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const view =
    pins.length === 1
      ? { center: [pins[0].lat, pins[0].lng] as [number, number], zoom: 12 }
      : {
          bounds: pins.map((p) => [p.lat, p.lng] as [number, number]),
          boundsOptions: { padding: [40, 40] as [number, number] },
        };

  return (
    <div
      role="region"
      aria-label="Mapa de lugares imperdibles"
      className="isolate h-[320px] overflow-hidden rounded-card sm:h-[420px]"
    >
      <MapContainer
        {...view}
        scrollWheelZoom={false}
        zoomAnimation={animate}
        fadeAnimation={animate}
        markerZoomAnimation={animate}
        className="h-full w-full"
      >
        <TileLayer
          url={TILE_URL}
          attribution={ATTRIBUTION}
          maxZoom={19}
        />
        {pins.map((pin) => (
          <Marker
            key={pin.n}
            position={[pin.lat, pin.lng]}
            icon={pinIcon(pin.n)}
            title={pin.name}
            keyboard
          >
            <Popup>{pin.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
