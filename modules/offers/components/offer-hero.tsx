import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HeroCarousel, type HeroCarouselSlide } from "@/components/shared/hero-carousel";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";

import { getOfferHrefs } from "../services/offer-link-service";
import { getActiveOffers } from "../services/offer-service";
import { describeOffer } from "../utils/offer-view";

const HERO_SLIDES = 4;
const HERO_CLASS = "min-h-[640px]";

// Entrada del texto (wy-up) solo con movimiento permitido; los delays escalonan título y precio.
// Clases literales: Tailwind no detecta las armadas en runtime.
const ENTER = "motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_both]";
const ENTER_D1 = "motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_.1s_both]";
const ENTER_D2 = "motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_.2s_both]";

export async function OfferHero() {
  // El service ya ordena con compareOffers (D3). `imageUrl` es obligatorio en el slide:
  // las ofertas cuyo paquete no tiene portada se omiten (como PackagesHero) y luego se toman 4.
  const offers = (await getActiveOffers())
    .filter((offer) => offer.package.coverImageUrl !== null)
    .slice(0, HERO_SLIDES);
  const hrefs = await getOfferHrefs(offers);

  const slides: HeroCarouselSlide[] = offers.map((offer) => {
    const { kindLabel, badge, badgeSub, wasLabel, nowLabel, note, validUntilLabel } =
      describeOffer(offer);
    const { title } = offer.package;

    return {
      id: offer.id,
      imageUrl: offer.package.coverImageUrl as string,
      label: `${badge} ${title}`,
      ariaLabel: `Ver ${title}`,
      content: (
        <div className="contents">
          {/* Solo móvil: el círculo de descuento va arriba; en escritorio es el `aside`. */}
          <span
            aria-hidden="true"
            className={`flex size-24 -rotate-8 flex-col items-center justify-center rounded-full bg-accent shadow-[0_12px_30px_rgba(194,65,12,.45)] md:hidden ${ENTER}`}
          >
            <span className="font-display text-[30px] leading-none font-extrabold tracking-[-0.03em]">
              {badge}
            </span>
            <span className="text-[11px] font-bold tracking-[0.06em] uppercase">{badgeSub}</span>
          </span>
          <span
            className={`self-start rounded-full bg-accent px-3.5 py-2 text-sm font-bold tracking-[0.08em] uppercase ${ENTER}`}
          >
            {kindLabel}
          </span>
          <p
            className={`font-display text-[clamp(44px,7vw,92px)] leading-[.92] font-extrabold tracking-[-0.045em] text-balance ${ENTER_D1}`}
          >
            {title}
          </p>
          <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${ENTER_D2}`}>
            <span className="flex items-baseline gap-3">
              <span className="font-display text-[40px] font-extrabold tracking-[-0.03em]">
                <span className="sr-only">Con oferta </span>
                {nowLabel}
              </span>
              <s className="text-xl text-white/75">
                <span className="sr-only">Antes </span>
                {wasLabel}
              </s>
            </span>
            <Button
              variant="cta"
              nativeButton={false}
              render={<Link href={hrefs[offer.id]} />}
            >
              Aprovechar oferta
              <ArrowRight aria-hidden strokeWidth={2.4} />
            </Button>
          </div>
          <span className={`text-sm text-white/80 ${ENTER_D2}`}>
            {note}
            {validUntilLabel && ` · Válido hasta ${validUntilLabel}`}
          </span>
        </div>
      ),
      aside: (
        <span
          aria-hidden="true"
          className="hidden size-[190px] shrink-0 -rotate-8 flex-col items-center justify-center rounded-full bg-bg text-accent shadow-[0_20px_50px_rgba(0,0,0,.3)] md:flex"
        >
          <span className="font-display text-[64px] leading-[.9] font-extrabold tracking-[-0.05em]">
            {badge}
          </span>
          <span className="text-sm font-bold tracking-[0.1em] text-ink uppercase">{badgeSub}</span>
        </span>
      ),
    };
  });

  // Sin ofertas (o sin portada): hero estático con el h1 visible; la página conserva el marco.
  if (slides.length === 0) {
    return (
      <PageHero className={HERO_CLASS} contentClassName="pb-14">
        <div className="flex flex-col gap-4">
          <h1 className="text-balance">Ofertas</h1>
          <p className="max-w-[560px] text-[clamp(17px,1.6vw,20px)] leading-normal text-white/90">
            Descuentos en paquetes y tours por todo el Perú.
          </p>
        </div>
      </PageHero>
    );
  }

  return (
    <HeroCarousel
      slides={slides}
      label="Ofertas destacadas"
      labels={{ tabs: "Elegir oferta", previous: "Oferta anterior", next: "Oferta siguiente" }}
      className={HERO_CLASS}
      // El bloque de slide (primer div) mide 300 en el tablero; el compartido trae 340.
      contentClassName="[&>div:first-of-type]:min-h-[300px]"
    >
      <h1 className="sr-only">Ofertas de viaje en Perú</h1>
    </HeroCarousel>
  );
}
