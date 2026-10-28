import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentOrganizer } from "@/modules/organizers";

import {
  getDepartureFormOptions,
  listOwnDepartures,
  type DepartureFormOptions,
  type OwnDepartureItem,
} from "../services/own-departure-service";
import { getWriteBlock, MANAGE_MESSAGES } from "../utils/manage-gate";
import { limaToday } from "../utils/tour-filters";
import { DepartureForm } from "./departure-form";
import { DepartureRow } from "./departure-row";

const CARD = "rounded-card bg-surface p-6 shadow-card md:p-8";

function DepartureSection({
  id,
  title,
  items,
  options,
  minDate,
  disabled,
}: {
  id: string;
  title: string;
  items: OwnDepartureItem[];
  options: DepartureFormOptions;
  minDate: string;
  disabled: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={id} className={CARD}>
      <h2 id={id} className="text-lg font-bold text-ink">
        {title}
      </h2>
      <ul className="mt-2 divide-y divide-border">
        {items.map((item) => (
          <DepartureRow
            key={item.id}
            item={item}
            options={options}
            minDate={minDate}
            disabled={disabled}
          />
        ))}
      </ul>
    </section>
  );
}

export async function DeparturesPage() {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return (
      <section aria-labelledby="departures-empty" className={CARD}>
        <h2 id="departures-empty" className="text-lg font-bold text-ink">
          Aún no tienes un perfil de operador
        </h2>
        <p className="mt-2 text-ink-muted">
          Cuando tu cuenta de operador esté creada, aquí podrás gestionar tus
          salidas.
        </p>
      </section>
    );
  }

  const [items, options] = await Promise.all([
    listOwnDepartures(organizer.id),
    getDepartureFormOptions(organizer.id),
  ]);
  // Después del await dinámico: new Date() no puede quedar en el prerender.
  const minDate = limaToday(new Date());
  const disabled = getWriteBlock(organizer.status, { publishing: false }) !== null;

  if (options.packages.length === 0) {
    return (
      <section aria-labelledby="departures-no-packages" className={CARD}>
        <h2 id="departures-no-packages" className="text-lg font-bold text-ink">
          Aún no tienes paquetes
        </h2>
        <p className="mt-2 text-ink-muted">
          Crea un paquete para poder programar sus salidas.
        </p>
        <Link
          href="/operador/paquetes/nuevo"
          className={buttonVariants({ variant: "cta", className: "mt-4" })}
        >
          Crear paquete
        </Link>
      </section>
    );
  }

  const upcoming = items.filter((i) => i.status === "scheduled" || i.status === "en_route");
  const history = items.filter((i) => i.status === "completed" || i.status === "cancelled");
  const shared = { options, minDate, disabled };

  return (
    <div className="flex flex-col gap-6">
      {disabled && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{MANAGE_MESSAGES.ORGANIZER_SUSPENDED}</AlertDescription>
        </Alert>
      )}

      {items.length === 0 && (
        <section aria-labelledby="departures-none" className={CARD}>
          <h2 id="departures-none" className="text-lg font-bold text-ink">
            Aún no tienes salidas
          </h2>
        </section>
      )}

      <DepartureSection id="departures-upcoming" title="Próximas" items={upcoming} {...shared} />
      <DepartureSection id="departures-history" title="Historial" items={history} {...shared} />

      <section aria-labelledby="departures-new" className={CARD}>
        <h2 id="departures-new" className="mb-4 text-lg font-bold text-ink">
          Nueva salida
        </h2>
        <DepartureForm mode="create" {...shared} />
      </section>
    </div>
  );
}
