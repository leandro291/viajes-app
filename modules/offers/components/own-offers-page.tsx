import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { instantToLimaParts } from "@/lib/lima-time";
import { getCurrentOrganizer } from "@/modules/organizers";
import { getWriteBlock, MANAGE_MESSAGES } from "@/modules/packages";

import type { OfferFormOptions, OwnOfferItem } from "../types/offer-manage";
import { getOfferFormOptions, listOffers } from "../services/offer-list-service";
import { offerState } from "../utils/offer-rules";
import { OwnOfferForm } from "./own-offer-form";
import { OwnOfferRow } from "./own-offer-row";

export const CARD = "rounded-card bg-surface p-6 shadow-card md:p-8";

export async function OwnOffersPage() {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return (
      <section aria-labelledby="offers-empty" className={CARD}>
        <h2 id="offers-empty" className="text-lg font-bold text-ink">
          Aún no tienes un perfil de operador
        </h2>
        <p className="mt-2 text-ink-muted">
          Cuando tu cuenta de operador esté creada, aquí podrás gestionar tus
          ofertas.
        </p>
      </section>
    );
  }

  const [items, options] = await Promise.all([
    listOffers(organizer),
    getOfferFormOptions(organizer),
  ]);
  // Después del await dinámico: new Date() no puede quedar en el prerender.
  const now = new Date();
  const minDate = instantToLimaParts(now).date;
  const disabled = getWriteBlock(organizer.status, { publishing: false }) !== null;

  if (options.packages.length === 0) {
    return (
      <section aria-labelledby="offers-no-packages" className={CARD}>
        <h2 id="offers-no-packages" className="text-lg font-bold text-ink">
          Aún no tienes paquetes
        </h2>
        <p className="mt-2 text-ink-muted">
          Crea un paquete para poder agregarle ofertas.
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

  return (
    <div className="flex flex-col gap-6">
      {disabled && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{MANAGE_MESSAGES.ORGANIZER_SUSPENDED}</AlertDescription>
        </Alert>
      )}
      <OffersManager
        panel="organizer"
        title="Mis ofertas"
        emptyText="Aún no tienes ofertas"
        items={items}
        options={options}
        now={now}
        minDate={minDate}
        disabled={disabled}
      />
    </div>
  );
}

// Cuerpo compartido con el panel admin: lista + formulario de alta.
export function OffersManager({
  panel,
  title,
  emptyText,
  items,
  options,
  now,
  minDate,
  disabled,
}: {
  panel: "organizer" | "admin";
  title: string;
  emptyText: string;
  items: OwnOfferItem[];
  options: OfferFormOptions;
  now: Date;
  minDate: string;
  disabled: boolean;
}) {
  return (
    <>
      <section aria-labelledby="offers-list" className={CARD}>
        <h2 id="offers-list" className="text-lg font-bold text-ink">
          {title}
        </h2>
        {items.length === 0 ? (
          <p className="mt-2 text-ink-muted">{emptyText}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {items.map((item) => (
              <OwnOfferRow
                key={item.id}
                item={item}
                state={offerState(item, now)}
                options={options}
                minDate={minDate}
                disabled={disabled}
                panel={panel}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="offers-new" className={CARD}>
        <h2 id="offers-new" className="mb-4 text-lg font-bold text-ink">
          Nueva oferta
        </h2>
        <OwnOfferForm
          mode="create"
          panel={panel}
          options={options}
          minDate={minDate}
          disabled={disabled}
        />
      </section>
    </>
  );
}
