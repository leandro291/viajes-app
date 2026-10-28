"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

// Q3: ajustables. El tope cuenta intentos, no reloj (una pestaña en segundo plano puede frenar el intervalo).
const REFRESH_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

export function ConfirmationRefresher() {
  const router = useRouter();
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(id);
        setExhausted(true);
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div aria-live="polite" className="flex flex-col items-start gap-4">
      <p className="text-base leading-relaxed text-muted-foreground">
        {exhausted
          ? "Está tardando más de lo normal. Si ya pagaste, tu reserva se confirmará en cuanto recibamos el aviso del pago; puedes actualizar la página."
          : "Esto toma unos segundos. Esta página se actualiza sola."}
      </p>
      {exhausted && (
        <Button type="button" onClick={() => router.refresh()}>
          Actualizar
        </Button>
      )}
    </div>
  );
}
