import { Suspense } from "react";

import { OrganizerShell, OrganizerStatusNotice } from "@/modules/organizers";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <OrganizerShell>
      <Suspense>
        <OrganizerStatusNotice />
      </Suspense>
      {children}
    </OrganizerShell>
  );
}
