import { UserProfile } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

export default function CuentaPage() {
  return (
    <div className="flex justify-center py-10">
      <Suspense>
        {/* routing="hash": las pestañas internas no necesitan ruta catch-all */}
        <UserProfile routing="hash" />
      </Suspense>
    </div>
  );
}
