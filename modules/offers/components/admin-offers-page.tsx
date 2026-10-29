import { requireRole } from "@/lib/auth/require-role";
import { instantToLimaParts } from "@/lib/lima-time";

import { getOfferFormOptions, listOffers } from "../services/offer-list-service";
import { CARD, OffersManager } from "./own-offers-page";

export async function AdminOffersPage() {
  await requireRole("admin");
  const [items, options] = await Promise.all([listOffers("all"), getOfferFormOptions("all")]);
  // Después del await dinámico: new Date() no puede quedar en el prerender.
  const now = new Date();
  const minDate = instantToLimaParts(now).date;

  if (options.packages.length === 0) {
    return (
      <section aria-labelledby="offers-no-packages" className={CARD}>
        <h2 id="offers-no-packages" className="text-lg font-bold text-ink">
          Aún no hay paquetes
        </h2>
        <p className="mt-2 text-ink-muted">
          Cuando un operador cree un paquete, podrás gestionar sus ofertas aquí.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OffersManager
        panel="admin"
        title="Ofertas"
        emptyText="Aún no hay ofertas"
        items={items}
        options={options}
        now={now}
        minDate={minDate}
        disabled={false}
      />
    </div>
  );
}
