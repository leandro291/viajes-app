"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

// Desde sm: accent con ícono; debajo de sm: botón ink sin ícono (tablero móvil).
export function PrintVoucherButton() {
  return (
    <Button
      type="button"
      variant="cta"
      onClick={() => window.print()}
      className="h-auto min-h-11 w-full gap-2 px-5 py-3.5 text-base max-sm:bg-ink max-sm:hover:bg-ink/90 print:hidden"
    >
      <Download aria-hidden className="size-[18px] stroke-[2.2] max-sm:hidden" />
      Descargar voucher
    </Button>
  );
}
