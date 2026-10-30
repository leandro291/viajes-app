import type { Metadata } from "next";
import { Suspense } from "react";

import { OrganizerShell, OrganizerStatusNotice } from "@/modules/organizers";

export const metadata: Metadata = { robots: { index: false, follow: false } };

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
