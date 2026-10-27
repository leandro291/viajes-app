import type { Metadata } from "next";
import { Suspense } from "react";

import { OrganizerProfileCard } from "@/modules/organizers";

export const metadata: Metadata = { title: "Panel del operador" };

export default function OperadorPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Panel del operador</h1>
      <Suspense>
        <OrganizerProfileCard />
      </Suspense>
    </>
  );
}
