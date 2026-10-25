import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

// `group/shell` + `has-[[data-page-hero]]`: una página con `PageHero` (data-page-hero)
// deja el encabezado superpuesto (ver SiteHeader) y `main` sin contenedor: cada
// sección pone el suyo. Sin hero, encabezado sólido y `main` contenido.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="group/shell relative flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 group-has-[[data-page-hero]]/shell:max-w-none group-has-[[data-page-hero]]/shell:px-0">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
