import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentOrganizer } from "@/modules/organizers";

import { listOwnPackages } from "../services/own-package-service";
import { PackageRow } from "./package-row";

const NEW_HREF = "/operador/paquetes/nuevo";

function CreateButton({
  label,
  variant,
  suspended,
  className,
}: {
  label: string;
  variant: "cta" | "outline";
  suspended: boolean;
  className?: string;
}) {
  const icon = <Plus aria-hidden="true" />;
  // Suspendido: botón deshabilitado en vez de link (no puede escribir).
  if (suspended) {
    return (
      <Button variant={variant} disabled className={className}>
        {icon}
        {label}
      </Button>
    );
  }
  return (
    <Button
      variant={variant}
      className={className}
      nativeButton={false}
      render={<Link href={NEW_HREF} />}
    >
      {icon}
      {label}
    </Button>
  );
}

export async function OwnPackagesList() {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return (
      <section
        aria-labelledby="packages-no-profile"
        className="rounded-card bg-surface p-6 shadow-card md:p-8"
      >
        <h2 id="packages-no-profile" className="text-lg font-bold text-ink">
          Aún no tienes un perfil de operador
        </h2>
        <p className="mt-2 text-ink-muted">
          Cuando tu cuenta de operador esté creada, aquí podrás gestionar tus
          paquetes.
        </p>
      </section>
    );
  }

  const items = await listOwnPackages(organizer);
  const suspended = organizer.status === "suspended";
  const empty = items.length === 0;

  return (
    <section
      aria-labelledby="packages-title"
      className="rounded-card bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="packages-title" className="text-lg font-bold text-ink">
          Tus paquetes
        </h2>
        <CreateButton
          label="Nuevo paquete"
          variant={empty ? "outline" : "cta"}
          suspended={suspended}
        />
      </div>

      {empty ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          <p className="text-ink-muted">Aún no tienes paquetes</p>
          <CreateButton label="Crear paquete" variant="cta" suspended={suspended} />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => (
            <PackageRow
              key={item.id}
              item={item}
              panel="organizer"
              organizerStatus={organizer.status}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
