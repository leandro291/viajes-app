import { BadgeCheckIcon, CreditCardIcon, TagIcon, TicketIcon } from "lucide-react"

const ITEMS = [
  { icon: CreditCardIcon, text: "Paga con tarjeta" },
  { icon: TicketIcon, text: "Voucher en la página de confirmación" },
  { icon: BadgeCheckIcon, text: "Operadores locales verificados" },
  { icon: TagIcon, text: "Precios en soles, por persona" },
]

export function TrustStrip() {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
      {ITEMS.map(({ icon: Icon, text }) => (
        <li
          key={text}
          className="flex items-center gap-3 text-sm font-medium text-ink-muted"
        >
          <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
          {text}
        </li>
      ))}
    </ul>
  )
}
