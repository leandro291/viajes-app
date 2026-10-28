import { and, asc, eq } from "drizzle-orm";

import { db, guides } from "@/lib/db";

import type { GuideDto, GuideInput } from "../schemas/guide-schema";
import type { ManageResult, OrganizerScope } from "../types/package-manage";
import { getWriteBlock, manageFail } from "../utils/manage-gate";

// Guías no se publican: `pending` puede escribir, `suspended` no (T10).
const blockOf = (scope: OrganizerScope) => getWriteBlock(scope.status, { publishing: false });

export async function listGuides(organizerId: string): Promise<GuideDto[]> {
  return db
    .select({ id: guides.id, name: guides.name, phone: guides.phone })
    .from(guides)
    .where(eq(guides.organizerId, organizerId))
    .orderBy(asc(guides.name));
}

export async function createGuide(
  scope: OrganizerScope,
  input: GuideInput,
): Promise<ManageResult<{ id: string }>> {
  const block = blockOf(scope);
  if (block) return manageFail(block);
  const [row] = await db
    .insert(guides)
    .values({ organizerId: scope.id, name: input.name, phone: input.phone })
    .returning({ id: guides.id });
  return { ok: true, id: row.id };
}

export async function updateGuide(
  scope: OrganizerScope,
  id: string,
  input: GuideInput,
): Promise<ManageResult> {
  const block = blockOf(scope);
  if (block) return manageFail(block);
  const rows = await db
    .update(guides)
    .set({ name: input.name, phone: input.phone })
    .where(and(eq(guides.id, id), eq(guides.organizerId, scope.id)))
    .returning({ id: guides.id });
  return rows.length ? { ok: true } : manageFail("NOT_FOUND");
}

// departures.guide_id es ON DELETE SET NULL: las salidas quedan sin guía.
export async function deleteGuide(scope: OrganizerScope, id: string): Promise<ManageResult> {
  const block = blockOf(scope);
  if (block) return manageFail(block);
  const rows = await db
    .delete(guides)
    .where(and(eq(guides.id, id), eq(guides.organizerId, scope.id)))
    .returning({ id: guides.id });
  return rows.length ? { ok: true } : manageFail("NOT_FOUND");
}
