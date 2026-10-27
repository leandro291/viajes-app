import type { organizerStatus } from "@/lib/db/schema/enums";

export type OrganizerStatus = (typeof organizerStatus.enumValues)[number];

export type OrganizerProfile = {
  id: string;
  businessName: string;
  ruc: string;
  whatsapp: string;
  status: OrganizerStatus;
};
