import { z } from "zod";

export const operatorStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["active", "suspended"]),
});

export type OperatorStatusInput = z.infer<typeof operatorStatusSchema>;
