"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { X } from "lucide-react";
import Image from "next/image";
import { useReducer, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { MapPin, PinCard } from "../utils/destination-page";

// Q3: proveedor de tiles intercambiable cambiando solo esta constante (y la atribución).
// CARTO pasó a exigir API key (devuelve un cartel "API KEY REQUIRED"); se usa OSM, sin clave.
// ponytail: la política de OSM limita el uso intensivo; pasar a un proveedor con clave si crece el tráfico.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Gota lisa, como en el tablero (allí el número no se ve). Chica en mapas angostos: 26x33 como el móvil.
const PIN_SVG = (color: string) =>
  `<svg width="40" height="50" viewBox="0 0 40 50" aria-hidden="true" class="block origin-bottom scale-[0.65] drop-shadow-[0_4px_6px_rgba(11,21,19,0.35)] transition-transform group-hover:scale-[0.72] @md:scale-100 @md:group-hover:scale-110 motion-reduce:transition-none ${color}"><path d="M20 48S4 30.5 4 19a16 16 0 0132 0c0 11.5-16 29-16 29z" fill="currentColor" stroke="#fff" stroke-width="3"/></svg>`;

// Sin etiquetas en mapas angostos (el tablero las oculta en móvil); el nombre sale en la tarjeta.
const LABEL_CLASS =
  "pointer-events-none absolute top-[9px] hidden @md:block rounded-full bg-white/95 px-[9px] py-[3px] text-[13px] font-bold whitespace-nowrap text-ink shadow-[0_1px_3px_rgba(11,21,19,0.15)]";

type Side = "left" | "right";
// Pines que se taparían en pantalla (o están en el mismo punto) se agrupan en uno solo.
type Stop = { lat: number; lng: number; side: Side; pins: MapPin[] };

const MERGE_PX = 36; // por debajo de esta distancia dos pines se tapan
const LABEL_PX = 130; // lo que ocupa una etiqueta a un lado del pin

function groupStops(pins: MapPin[], map: L.Map): Stop[] {
  const groups: { pt: L.Point; pins: MapPin[] }[] = [];
  for (const p of pins) {
    const pt = map.latLngToContainerPoint([p.lat, p.lng]);
    const near = groups.find((g) => g.pt.distanceTo(pt) < MERGE_PX);
    if (near) near.pins.push(p);
    else groups.push({ pt, pins: [p] });
  }
  const mid = map.getSize().x / 2;
  return groups.map((g) => {
    // La etiqueta mira al centro del mapa para no salirse del borde...
    let side: Side = g.pt.x > mid ? "left" : "right";
    // ...y se voltea si otro pin, a su altura, quedaría debajo de ella.
    const dir = side === "right" ? 1 : -1;
    const covered = groups.some(
      (o) =>
        o !== g &&
        Math.abs(o.pt.y - g.pt.y) < 30 &&
        (o.pt.x - g.pt.x) * dir > 0 &&
        Math.abs(o.pt.x - g.pt.x) < LABEL_PX,
    );
    if (covered) side = side === "right" ? "left" : "right";
    return { lat: g.pins[0].lat, lng: g.pins[0].lng, side, pins: g.pins };
  });
}

function stopName(stop: Stop) {
  const extra = stop.pins.length - 1;
  return extra > 0 ? `${stop.pins[0].name} +${extra}` : stop.pins[0].name;
}

function pinIcon(stop: Stop, active: boolean) {
  const el = document.createElement("div");
  el.innerHTML = PIN_SVG(active ? "text-ink" : "text-accent");
  const label = document.createElement("span");
  // textContent, no innerHTML: el nombre lo escribe el operador.
  label.textContent = stopName(stop);
  label.className = `${LABEL_CLASS} ${stop.side === "right" ? "left-[42px]" : "right-[42px]"}`;
  el.append(label);
  return L.divIcon({
    html: el,
    className: "group",
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  });
}

// Tarjeta del tablero: foto, "DÍA 1 · CUSCO", título y nota. Se quita el marco por defecto de Leaflet.
const POPUP_CLASS =
  "[&_.leaflet-popup-content-wrapper]:overflow-hidden [&_.leaflet-popup-content-wrapper]:rounded-[18px]! [&_.leaflet-popup-content-wrapper]:p-0! [&_.leaflet-popup-content-wrapper]:text-ink! [&_.leaflet-popup-content-wrapper]:shadow-[0_18px_40px_-14px_rgba(11,21,19,0.5)]! [&_.leaflet-popup-content]:m-0!";

function StopCard({ pins }: { pins: (MapPin & { card: PinCard })[] }) {
  const map = useMap();
  const imageUrl = pins[0].card.imageUrl;
  return (
    <div className="relative w-[270px]">
      {imageUrl && (
        <div className="relative h-28">
          <Image src={imageUrl} alt="" fill sizes="270px" className="object-cover" />
        </div>
      )}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => map.closePopup()}
        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/95 text-ink transition-colors hover:bg-sand"
      >
        <X aria-hidden className="size-3.5" strokeWidth={2.8} />
      </button>
      <div className="flex flex-col gap-3 px-4 pt-3.5 pb-4">
        {pins.map((p) => (
          <div key={p.n} className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-[0.08em] text-accent uppercase">
              {p.card.eyebrow}
            </span>
            <span className="font-display text-[17px] leading-[1.2] font-bold">{p.card.title}</span>
            {p.card.note && <span className="text-[13px] text-ink-muted">{p.card.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function hasCard(p: MapPin): p is MapPin & { card: PinCard } {
  return p.card !== undefined;
}

function Stops({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  const [active, setActive] = useState<number | null>(null);
  // Los grupos dependen del zoom y del tamaño: al acercar, los pines se separan.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useMapEvents({ zoomend: refresh, resize: refresh });

  return groupStops(pins, map).map((stop) => {
    const key = stop.pins[0].n;
    return (
      <Marker
        key={key}
        position={[stop.lat, stop.lng]}
        icon={pinIcon(stop, active === key)}
        title={stopName(stop)}
        keyboard
        eventHandlers={{
          popupopen: () => setActive(key),
          popupclose: () => setActive((a) => (a === key ? null : a)),
        }}
      >
        <Popup closeButton={false} minWidth={270} maxWidth={270} className={POPUP_CLASS}>
          {stop.pins.every(hasCard) ? (
            <StopCard pins={stop.pins} />
          ) : (
            stop.pins.map((p) => (
              <div key={p.n}>
                {stop.pins.length > 1 && `${p.n}. `}
                {p.name}
              </div>
            ))
          )}
        </Popup>
      </Marker>
    );
  });
}

export default function DestinationMapCanvas({
  pins,
  label = "Mapa de lugares imperdibles",
  route = false,
  zoom = 12,
}: {
  pins: MapPin[];
  label?: string;
  /** Une los pines en orden con una línea (itinerario). */
  route?: boolean;
  /** Zoom cuando hay un solo pin. */
  zoom?: number;
}) {
  // Solo cliente (ssr: false): leer matchMedia en el inicializador es seguro.
  const [animate] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const view =
    pins.length === 1
      ? { center: [pins[0].lat, pins[0].lng] as [number, number], zoom }
      : {
          bounds: pins.map((p) => [p.lat, p.lng] as [number, number]),
          boundsOptions: { padding: [40, 40] as [number, number] },
        };

  return (
    <div
      role="region"
      aria-label={label}
      className="@container isolate h-[320px] overflow-hidden rounded-card sm:h-[420px]"
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
        {route && (
          <Polyline
            positions={pins.map((p) => [p.lat, p.lng])}
            pathOptions={{ className: "stroke-accent", weight: 4.5, opacity: 1 }}
          />
        )}
        <Stops pins={pins} />
      </MapContainer>
    </div>
  );
}
