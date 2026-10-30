import { StatusBadge } from "@/components/shared/status-badge";

import { getCurrentOrganizer } from "../services/current-organizer";
import { ORGANIZER_STATUS_BADGE } from "../utils/organizer-status-badge";

const CARD = "rounded-card bg-surface p-6 shadow-card md:p-8";

export async function OrganizerProfileCard() {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return (
      <section aria-labelledby="organizer-empty" className={CARD}>
        <h2 id="organizer-empty" className="text-lg font-bold text-ink">
          Aún no tienes un perfil de operador
        </h2>
        <p className="mt-2 text-ink-muted">
          Cuando tu cuenta de operador esté creada, aquí verás los datos de tu
          empresa.
        </p>
      </section>
    );
  }

  const badge = ORGANIZER_STATUS_BADGE[organizer.status];
  const fields = [
    { label: "Razón social", value: organizer.businessName },
    { label: "RUC", value: organizer.ruc },
    { label: "WhatsApp", value: organizer.whatsapp },
  ];

  return (
    <section aria-labelledby="organizer-profile" className={CARD}>
      <h2 id="organizer-profile" className="text-lg font-bold text-ink">
        Datos de la empresa
      </h2>
      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-sm font-bold text-ink-muted">{label}</dt>
            <dd className="mt-1 break-words text-ink">{value}</dd>
          </div>
        ))}
        <div>
          <dt className="text-sm font-bold text-ink-muted">Estado</dt>
          <dd className="mt-1">
            <StatusBadge status={badge.status} label={badge.label} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
