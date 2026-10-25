import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";

import { SiteNav, SiteNavPlain } from "@/components/shared/site-nav";
import { SITE_LINKS } from "@/components/shared/site-links";
import { WayraLogo } from "@/components/shared/wayra-logo";

// Depende del ancestro `group/shell` de app/(public)/layout.tsx: si la página trae un
// `[data-page-hero]`, el encabezado es transparente y va superpuesto sobre la foto;
// si no, queda sólido y en flujo. Conserva `bg-dark` para que el foco use `focus`.
export function SiteHeader() {
  return (
    <header className="z-30 bg-dark text-white group-has-[[data-page-hero]]/shell:absolute group-has-[[data-page-hero]]/shell:inset-x-0 group-has-[[data-page-hero]]/shell:top-0 group-has-[[data-page-hero]]/shell:bg-transparent">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-10 gap-y-3 px-6 py-5">
        <WayraLogo />
        <Suspense fallback={<SiteNavPlain links={SITE_LINKS} />}>
          <SiteNav links={SITE_LINKS} />
        </Suspense>
        <div className="flex items-center gap-2">
          <span className="px-3 py-2.5 text-base font-medium whitespace-nowrap text-white">
            PEN · S/
          </span>
          <Suspense>
            <Show when="signed-out">
              <SignInButton>
                <button className="inline-flex min-h-11 cursor-pointer items-center px-3 py-2.5 text-[15px] font-bold whitespace-nowrap text-white transition-colors duration-150 hover:text-accent-soft">
                  Iniciar sesión
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-white px-[22px] py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-accent-soft">
                  Registrarse
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
