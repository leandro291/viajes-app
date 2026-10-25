import { Check } from "lucide-react"

const ITEMS = [
  "Confirmación inmediata",
  "Cancelación gratis hasta 48 h antes",
  "Paga con tarjeta",
  "Soporte en español por WhatsApp",
]

export function TrustStrip() {
  return (
    <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2.5 px-2 pt-[22px] text-[15px] font-medium text-[#2E4A48]">
      {ITEMS.map((text) => (
        <li key={text} className="flex items-center gap-2">
          <Check aria-hidden className="size-[18px] text-primary" strokeWidth={2.4} />
          {text}
        </li>
      ))}
    </ul>
  )
}
