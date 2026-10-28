import { getCurrentOrganizer } from "@/modules/organizers";

import { listGuides } from "../services/guide-service";
import { GuideManager } from "./guide-manager";

export async function GuidesPage() {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return (
      <section
        aria-labelledby="guides-empty"
        className="rounded-card bg-surface p-6 shadow-card md:p-8"
      >
        <h2 id="guides-empty" className="text-lg font-bold text-ink">
          Aún no tienes un perfil de operador
        </h2>
        <p className="mt-2 text-ink-muted">
          Cuando tu cuenta de operador esté creada, aquí podrás gestionar tus
          guías.
        </p>
      </section>
    );
  }

  const guides = await listGuides(organizer.id);
  return <GuideManager guides={guides} organizerStatus={organizer.status} />;
}
