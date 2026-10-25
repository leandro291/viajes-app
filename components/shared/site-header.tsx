import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";

import { SITE_LINKS } from "@/components/shared/site-links";
import { WayraLogo } from "@/components/shared/wayra-logo";

export function SiteHeader() {
  return (
    <header className="bg-dark text-white">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-2">
        <WayraLogo />
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1">
          <nav aria-label="Principal" className="min-w-0">
            <ul className="flex flex-wrap gap-x-6">
              {SITE_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center text-[15px] font-medium text-white hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <span className="text-[15px] font-medium text-white">PEN · S/</span>
          <Suspense>
            <Show when="signed-out">
              <SignInButton>
                <button className="inline-flex min-h-11 items-center text-[15px] font-medium text-white hover:underline">
                  Ingresar
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-4 text-[15px] font-bold text-white hover:bg-white/10">
                  Crear cuenta
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </Suspense>
        </div>
      </div>
    </header>
  );
}
