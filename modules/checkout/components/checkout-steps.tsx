import { Check } from "lucide-react";

// Pagar es siempre el paso 2: el paquete ya se eligió y la confirmación llega después.
export function CheckoutSteps() {
  return (
    <ol
      aria-label="Pasos de la reserva"
      className="grid list-none grid-cols-3 gap-2.5 p-0"
    >
      <li className="flex flex-col gap-2.5">
        <span aria-hidden className="h-1 rounded bg-primary" />
        <span className="flex items-center gap-2 text-[15px] font-medium text-ink-muted">
          <Check aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={3} />
          <span>
            <span className="sr-only">Completado: </span>1 · Paquete
          </span>
        </span>
      </li>
      <li aria-current="step" className="flex flex-col gap-2.5">
        <span
          aria-hidden
          className="h-1 rounded bg-[linear-gradient(to_right,var(--color-accent)_50%,#E4DED2_50%)]"
        />
        <span className="text-[15px] font-bold">2 · Datos y pago</span>
      </li>
      <li className="flex flex-col gap-2.5">
        <span aria-hidden className="h-1 rounded bg-[#E4DED2]" />
        <span className="text-[15px] font-medium text-ink-muted">3 · Confirmación</span>
      </li>
    </ol>
  );
}
