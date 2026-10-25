import Image from "next/image"
import { CreditCardIcon, MapPinIcon, ReceiptTextIcon, RouteIcon } from "lucide-react"

const POINTS = [
  {
    icon: MapPinIcon,
    title: "Operadores locales",
    description: "Trabajamos con operadores peruanos revisados por nuestro equipo.",
  },
  {
    icon: ReceiptTextIcon,
    title: "Precios claros",
    description: "Ves el precio por persona, en soles, antes de reservar.",
  },
  {
    icon: CreditCardIcon,
    title: "Reserva en minutos",
    description: "Elige tu paquete, completa tus datos y paga con tarjeta.",
  },
  {
    icon: RouteIcon,
    title: "Viajes a tu medida",
    description: "¿Quieres algo distinto? Escríbenos y armamos tu itinerario.",
  },
]

// Fotos del seed (D9): se reubican cuando las fotos pasen a Blob.
export function WhyWayra() {
  return (
    <section className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-14 px-6 pt-[110px]">
      <div className="relative min-h-[520px] min-w-0 flex-[1_1_420px]">
        <div className="absolute top-0 left-0 h-[82%] w-[78%] overflow-hidden rounded-[28px] bg-sand">
          <Image
            src="/seed/par.jpg"
            alt="Barcas de pescadores en el puerto de Paracas"
            fill
            sizes="(min-width: 1024px) 480px, 80vw"
            className="object-cover"
          />
        </div>
        <div className="absolute right-0 bottom-0 h-[52%] w-[52%] overflow-hidden rounded-[28px] border-8 border-bg bg-sand">
          <Image
            src="/seed/uro.jpg"
            alt="Balsa de totora en las islas flotantes de los Uros"
            fill
            sizes="(min-width: 1024px) 320px, 55vw"
            className="object-cover"
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-7">
        <div className="flex flex-col gap-3.5">
          <span className="text-[13px] font-bold tracking-[0.1em] text-accent uppercase">
            Por qué Wayra
          </span>
          <h2 className="leading-[1.02] text-ink">
            Tú eliges la fecha. Del resto nos encargamos.
          </h2>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-7 gap-y-[26px]">
          {POINTS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex flex-col gap-2.5">
              <span className="flex size-12 items-center justify-center rounded-[14px] bg-primary-soft text-primary">
                <Icon aria-hidden="true" className="size-6" strokeWidth={2} />
              </span>
              <h3 className="text-xl font-bold text-ink">{title}</h3>
              <p className="leading-[1.55] text-ink-muted">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
