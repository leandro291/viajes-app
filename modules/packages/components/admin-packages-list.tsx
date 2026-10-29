import { requireRole } from "@/lib/auth/require-role";

import { listOwnPackages } from "../services/own-package-service";
import { PackageRow } from "./package-row";

export async function AdminPackagesList() {
  await requireRole("admin");
  const items = await listOwnPackages("all");

  return (
    <section
      aria-labelledby="packages-title"
      className="rounded-card bg-surface p-6 shadow-card md:p-8"
    >
      <h2 id="packages-title" className="text-lg font-bold text-ink">
        Paquetes
      </h2>

      {items.length === 0 ? (
        <p className="mt-6 text-ink-muted">Aún no hay paquetes</p>
      ) : (
        // ponytail: sin paginar; paginar si el catálogo crece.
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => (
            <PackageRow key={item.id} item={item} panel="admin" organizerStatus="active" />
          ))}
        </ul>
      )}
    </section>
  );
}
