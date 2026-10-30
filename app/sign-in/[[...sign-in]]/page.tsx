import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense>
        <SignIn />
      </Suspense>
    </div>
  );
}
