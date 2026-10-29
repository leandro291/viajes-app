import { notFound } from "next/navigation";

import { getCurrentOrganizer } from "@/modules/organizers";

import { getManageOptions, getOwnPackageForEdit } from "../services/own-package-service";
import { emptyFormValues, toFormValues } from "../utils/package-form";
import { PackageForm } from "./package-form";

export async function PackageEditor({ packageId }: { packageId?: string }) {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return (
      <section
        aria-labelledby="package-editor-empty"
        className="rounded-card bg-surface p-6 shadow-card md:p-8"
      >
        <h2 id="package-editor-empty" className="text-lg font-bold text-ink">
          Aún no tienes un perfil de operador
        </h2>
        <p className="mt-2 text-ink-muted">
          Cuando tu cuenta de operador esté creada, aquí podrás crear y editar tus paquetes.
        </p>
      </section>
    );
  }

  if (packageId === undefined) {
    return (
      <PackageForm
        mode="create"
        initialValues={emptyFormValues()}
        initialStatus="draft"
        departureCount={0}
        options={await getManageOptions()}
        organizerStatus={organizer.status}
      />
    );
  }

  const [edit, options] = await Promise.all([
    getOwnPackageForEdit(organizer, packageId),
    getManageOptions(),
  ]);
  if (!edit) notFound();

  return (
    <PackageForm
      mode="edit"
      packageId={edit.id}
      initialValues={toFormValues(edit.values)}
      initialStatus={edit.values.status}
      departureCount={edit.departureCount}
      options={options}
      organizerStatus={organizer.status}
    />
  );
}
