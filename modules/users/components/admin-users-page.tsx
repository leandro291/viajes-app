import { StatusBadge } from "@/components/shared/status-badge";
import { instantToLimaParts } from "@/lib/lima-time";
import { requireRole } from "@/lib/auth/require-role";

import { listAdmins } from "../services/admin-service";
import type { AdminItem } from "../types/admin-manage";
import { GrantAdminForm } from "./grant-admin-form";
import { RevokeAdminButton } from "./revoke-admin-button";

const DATE_FORMAT = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" });

const ROLE_BADGE: Record<AdminItem["role"], { status: "confirmed" | "neutral"; label: string }> = {
  super_admin: { status: "neutral", label: "Super administrador" },
  admin: { status: "confirmed", label: "Administrador" },
};

export async function AdminUsersPage() {
  await requireRole("super_admin");
  const items = await listAdmins();

  return (
    <section aria-labelledby="admins-title" className="rounded-card bg-surface p-6 shadow-card md:p-8">
      <h2 id="admins-title" className="text-lg font-bold text-ink">
        Administradores
      </h2>
      {items.length === 0 ? (
        <p className="mt-6 text-ink-muted">Aún no hay administradores</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => {
            const badge = ROLE_BADGE[item.role];
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-bold text-ink">{item.name ?? item.email}</p>
                    <StatusBadge status={badge.status} label={badge.label} />
                  </div>
                  {item.name && <p className="break-words text-ink-muted">{item.email}</p>}
                  <p className="text-ink-muted">
                    Alta:{" "}
                    <time dateTime={instantToLimaParts(item.createdAt).date}>
                      {DATE_FORMAT.format(item.createdAt)}
                    </time>
                  </p>
                </div>
                {item.role === "admin" && (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <RevokeAdminButton id={item.id} label={item.name ?? item.email} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <GrantAdminForm />
    </section>
  );
}
