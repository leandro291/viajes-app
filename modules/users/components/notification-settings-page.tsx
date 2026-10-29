import { requireRole } from "@/lib/auth/require-role";

import { getNotificationPreferences } from "../services/notification-preference-service";
import { getUserByClerkId } from "../services/user-service";
import { NotificationSwitches } from "./notification-switches";

export async function NotificationSettingsPage() {
  const { userId } = await requireRole("super_admin");
  const user = await getUserByClerkId(userId);
  const initial = user ? await getNotificationPreferences(user.id) : null;

  return (
    <section aria-labelledby="notifications-title" className="rounded-card bg-surface p-6 shadow-card md:p-8">
      <h2 id="notifications-title" className="text-lg font-bold text-ink">
        Notificaciones
      </h2>
      {initial ? (
        <>
          <p className="mt-2 text-ink-muted">
            Por ahora solo se guardan tus preferencias: aún no enviamos correos ni mensajes.
          </p>
          <NotificationSwitches initial={initial} />
        </>
      ) : (
        <p className="mt-6 text-ink-muted">No encontramos tu perfil todavía</p>
      )}
    </section>
  );
}
