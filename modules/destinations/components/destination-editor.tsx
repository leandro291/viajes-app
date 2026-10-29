import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";

import { destinationIdSchema } from "../schemas/destination-schema";
import { getDestinationForEdit } from "../services/destination-admin-service";
import { emptyFormValues, toFormValues } from "../utils/destination-form";
import { DestinationForm } from "./destination-form";

export async function DestinationEditor({ destinationId }: { destinationId?: string }) {
  await requireRole("admin");

  if (destinationId === undefined) {
    return <DestinationForm initialValues={emptyFormValues()} />;
  }

  // id inválido o inexistente -> 404 (no se consulta la BD con un no-uuid).
  const idParsed = destinationIdSchema.safeParse(destinationId);
  if (!idParsed.success) notFound();
  const edit = await getDestinationForEdit(idParsed.data);
  if (!edit) notFound();

  return <DestinationForm destinationId={edit.id} initialValues={toFormValues(edit.values)} />;
}
