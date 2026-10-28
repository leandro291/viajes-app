import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

// `group/shell` + `has-[[data-page-hero]]`: una página con `PageHero` (data-page-hero)
// deja el encabezado superpuesto (ver SiteHeader) y `main` sin contenedor: cada
// sección pone el suyo. Sin hero, encabezado sólido y `main` contenido.
// Encabezado y pie en `contents print:hidden`: no alteran el layout y se ocultan al imprimir.
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="group/shell relative flex flex-1 flex-col">
      <div className="contents print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 group-has-[[data-page-hero]]/shell:max-w-none group-has-[[data-page-hero]]/shell:px-0">
        {children}
      </main>
      <div className="contents print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
