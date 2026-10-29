import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Suspense } from "react";

import { MobileMenu } from "@/components/shared/mobile-menu";
import { SiteNav, SiteNavPlain } from "@/components/shared/site-nav";
import { SITE_LINKS } from "@/components/shared/site-links";
import { UserMenu } from "@/components/shared/user-menu";
import { WayraLogo } from "@/components/shared/wayra-logo";

// Depende del ancestro `group/shell` de app/(public)/layout.tsx: si la página trae un
// `[data-page-hero]`, el encabezado es transparente y va superpuesto sobre la foto;
// si no, queda sólido y en flujo. Conserva `bg-dark` para que el foco use `focus`.
export function SiteHeader() {
  return (
    <header className="relative z-30 bg-dark text-white group-has-[[data-page-hero]]/shell:absolute group-has-[[data-page-hero]]/shell:inset-x-0 group-has-[[data-page-hero]]/shell:top-0 group-has-[[data-page-hero]]/shell:bg-transparent">
      {/* Móvil (< md): logo + Ingresar + botón de menú en una fila; desde md, nav y botones completos. */}
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-2 px-4 py-3.5 md:flex-wrap md:justify-start md:gap-x-10 md:gap-y-3 md:px-6 md:py-5">
        <WayraLogo />
        <div className="max-md:hidden md:contents">
          <Suspense fallback={<SiteNavPlain links={SITE_LINKS} />}>
            <SiteNav links={SITE_LINKS} />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-2.5 text-base font-medium whitespace-nowrap text-white max-md:hidden">
            PEN · S/
          </span>
          <Suspense>
            <Show when="signed-out">
              <SignInButton>
                <button className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-white px-4 text-sm font-bold whitespace-nowrap text-ink md:hidden">
                  Ingresar
                </button>
              </SignInButton>
              <SignInButton>
                <button className="inline-flex min-h-11 cursor-pointer items-center px-3 py-2.5 text-[15px] font-bold whitespace-nowrap text-white transition-colors duration-150 hover:text-accent-soft max-md:hidden">
                  Iniciar sesión
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-white px-[22px] py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-accent-soft max-md:hidden">
                  Registrarse
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserMenu />
            </Show>
          </Suspense>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
