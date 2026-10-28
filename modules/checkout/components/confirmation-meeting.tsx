import { Clock, MapPin, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDepartureDate, formatDepartureTime } from "@/modules/packages";

import { buildMapLinks } from "../utils/meeting-links";
import { MeetingPointMap } from "./meeting-point-map";

const ICON_BOX =
  "flex size-10 flex-none items-center justify-center rounded-xl bg-sand text-accent";
const DT = "text-xs font-bold tracking-[0.08em] text-ink-muted uppercase";
const ROUTE_BTN =
  "h-auto min-h-11 flex-[1_1_auto] gap-2 rounded-full px-5 py-[13px] text-base font-bold";

// Sin coordenadas válidas: solo el texto (sin mapa ni enlaces). Datos omitidos del
// tablero (reconocernos, 15 min antes, hotel): no existen en el esquema.
export function ConfirmationMeeting({
  meetingPoint,
  lat,
  lng,
  startsAt,
}: {
  meetingPoint: string | null;
  lat: number | null;
  lng: number | null;
  startsAt: Date;
}) {
  const links = buildMapLinks(lat, lng);
  const where = meetingPoint ?? "Por confirmar";
  const when = `${formatDepartureDate(startsAt)} · ${formatDepartureTime(startsAt)}`;

  return (
    <section aria-labelledby="h-meet" className="flex flex-col gap-7">
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-bold tracking-[0.1em] text-accent uppercase">
          El día de la salida
        </span>
        <h2
          id="h-meet"
          className="text-[clamp(30px,3.6vw,42px)] leading-none text-ink max-sm:text-[26px]"
        >
          Punto de encuentro
        </h2>
      </div>
      <div className="flex flex-wrap overflow-hidden rounded-3xl border border-[#EAE4D9] bg-white sm:rounded-[30px]">
        {links && lat != null && lng != null && (
          <div className="relative min-h-[270px] flex-[3_1_420px] sm:min-h-[400px] print:hidden">
            <div className="absolute inset-0">
              <MeetingPointMap
                lat={lat}
                lng={lng}
                label={where}
                time={formatDepartureTime(startsAt)}
              />
            </div>
          </div>
        )}
        <div className="flex flex-[2_1_300px] flex-col gap-[22px] p-5 sm:p-8">
          <dl className="m-0 flex flex-col gap-[18px]">
            <div className="flex items-start gap-3.5">
              <span aria-hidden className={ICON_BOX}>
                <MapPin className="size-5" strokeWidth={2} />
              </span>
              <div className="flex flex-col gap-0.5">
                <dt className={DT}>Dónde</dt>
                <dd className="m-0 text-[17px] font-bold">{where}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <span aria-hidden className={ICON_BOX}>
                <Clock className="size-5" strokeWidth={2} />
              </span>
              <div className="flex flex-col gap-0.5">
                <dt className={DT}>Cuándo</dt>
                <dd className="m-0 text-[17px] font-bold">{when}</dd>
              </div>
            </div>
          </dl>
          {links && (
            <div className="mt-auto flex flex-wrap gap-2.5 print:hidden">
              <Button
                variant="cta"
                nativeButton={false}
                className={ROUTE_BTN}
                render={<a href={links.google} target="_blank" rel="noopener noreferrer" />}
              >
                <Navigation aria-hidden className="size-[18px]" strokeWidth={2.2} />
                Cómo llegar
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                className={`${ROUTE_BTN} border-[1.5px] border-ink bg-transparent text-ink hover:bg-ink hover:text-white`}
                render={<a href={links.waze} target="_blank" rel="noopener noreferrer" />}
              >
                Abrir en Waze
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
