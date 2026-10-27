import { CircleX, Clock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import { getCurrentOrganizer } from "../services/current-organizer";
import {
  getOrganizerNotice,
  type OrganizerNotice,
} from "../utils/organizer-status-notice";

const TONES = {
  pending: {
    Icon: Clock,
    className: "border-status-pending/30 bg-status-pending-bg text-status-pending",
  },
  suspended: {
    Icon: CircleX,
    className:
      "border-status-cancelled/30 bg-status-cancelled-bg text-status-cancelled",
  },
} as const satisfies Record<OrganizerNotice["tone"], object>;

export async function OrganizerStatusNotice() {
  const notice = getOrganizerNotice((await getCurrentOrganizer())?.status);
  if (!notice) return null;

  const { Icon, className } = TONES[notice.tone];
  return (
    <Alert role="status" className={cn("mb-6 px-4 py-3", className)}>
      <Icon aria-hidden strokeWidth={2.5} />
      <AlertTitle className="font-bold">{notice.title}</AlertTitle>
      <AlertDescription className="text-current">
        {notice.description}
      </AlertDescription>
    </Alert>
  );
}
