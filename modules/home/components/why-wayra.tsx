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

export function WhyWayra() {
  return (
    <section className="py-12">
      <h2 className="font-display text-3xl font-bold text-ink">Por qué Wayra</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex flex-col gap-3">
            <span className="flex size-12 items-center justify-center rounded-field bg-primary-soft text-primary">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
            <p className="text-ink-muted">{description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
