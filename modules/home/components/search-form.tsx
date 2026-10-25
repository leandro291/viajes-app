import { CalendarDays, MapPin, SearchIcon, Users } from "lucide-react"

import { Button } from "@/components/ui/button"

const field =
  "flex items-center gap-3.5 rounded-[18px] bg-sand px-[18px] py-3"
const caption =
  "text-xs font-bold tracking-[0.06em] text-ink-muted uppercase"
// h-11 + -mb-4: el control mide >= 44 px de alto sin cambiar la altura visual de la tarjeta.
const control =
  "-mb-4 h-11 w-full min-w-0 border-0 bg-transparent p-0 pb-4 text-[17px] font-medium text-ink"
const icon = "size-[22px] shrink-0 text-primary"

// `fecha` y `viajeros` se envían pero /paquetes los ignora hoy (filtros reales: spec posterior).
export function SearchForm({
  destinations,
}: {
  destinations: { slug: string; name: string }[]
}) {
  return (
    <form
      action="/paquetes"
      method="get"
      className="flex flex-wrap gap-2 rounded-[26px] bg-surface p-3 shadow-[0_24px_60px_rgba(11,21,19,.18),0_2px_6px_rgba(11,21,19,.06)]"
    >
      <label className={`${field} flex-[2_1_220px]`}>
        <MapPin aria-hidden className={icon} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={caption}>¿A dónde vas?</span>
          <select name="destino" defaultValue="" className={control}>
            <option value="">Todo el Perú</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className={`${field} flex-[1_1_170px]`}>
        <CalendarDays aria-hidden className={icon} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={caption}>Fecha</span>
          <input type="date" name="fecha" className={control} />
        </span>
      </label>
      <label className={`${field} flex-[1_1_150px]`}>
        <Users aria-hidden className={icon} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={caption}>Viajeros</span>
          <select name="viajeros" defaultValue="2" className={control}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "adulto" : "adultos"}
              </option>
            ))}
          </select>
        </span>
      </label>
      <Button
        type="submit"
        variant="cta"
        className="h-auto flex-[1_1_140px] gap-2.5 rounded-[18px] px-6 py-[18px]"
      >
        <SearchIcon aria-hidden className="size-5" strokeWidth={2.4} />
        Buscar
      </Button>
    </form>
  )
}
