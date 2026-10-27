import { cache } from "react";

import { requireRole } from "@/lib/auth/require-role";

import { getOrganizerByClerkId } from "./organizer-service";

// Una sola consulta por request: layout y página comparten el resultado.
export const getCurrentOrganizer = cache(async () =>
  getOrganizerByClerkId((await requireRole("organizer")).userId),
);
