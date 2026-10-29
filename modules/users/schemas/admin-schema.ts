import { z } from "zod";

export const grantAdminSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) });
export const revokeAdminSchema = z.object({ id: z.uuid() });
