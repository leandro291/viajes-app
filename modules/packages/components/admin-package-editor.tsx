import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";

import { getManageOptions, getOwnPackageForEdit } from "../services/own-package-service";
import { toFormValues } from "../utils/package-form";
import { PackageForm } from "./package-form";

export async function AdminPackageEditor({ packageId }: { packageId: string }) {
  await requireRole("admin");

  // getOwnPackageForEdit devuelve null con un id mal formado.
  const [edit, options] = await Promise.all([
    getOwnPackageForEdit("all", packageId),
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
      organizerStatus="active"
      panel="admin"
    />
  );
}
