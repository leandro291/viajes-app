import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function Home() {
  return (
    <div className="flex flex-col items-start gap-8 py-12">
      <h1>Base visual de Wayra</h1>
      <p className="max-w-xl text-lg text-ink-muted">
        Identidad, componentes base y estructura de rutas listos para construir
        las pantallas.
      </p>
      <Button
        variant="cta"
        nativeButton={false}
        render={<Link href="/paquetes" />}
      >
        Ver paquetes
      </Button>

      {/* Muestra D4: se reemplaza con la spec de Inicio */}
      <section
        aria-label="Muestra de componentes"
        className="flex w-full max-w-md flex-col gap-6"
      >
        <div className="flex flex-wrap gap-3">
          <StatusBadge status="confirmed" />
          <StatusBadge status="pending" />
          <StatusBadge status="cancelled" />
          <StatusBadge status="neutral" />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-base">
          <Switch />
          Recibir novedades
        </label>
        <Field>
          <FieldLabel htmlFor="demo-name">Nombre</FieldLabel>
          <Input id="demo-name" />
        </Field>
      </section>
    </div>
  );
}
