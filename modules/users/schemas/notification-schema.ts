import { z } from "zod";

import { notificationKey } from "@/lib/db/schema/enums";

export const notificationPreferenceSchema = z.object({
  key: z.enum(notificationKey.enumValues),
  enabled: z.boolean(),
});
