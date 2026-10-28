import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import {
  HeroCarousel,
  type HeroCarouselSlide,
} from "@/components/shared/hero-carousel";
import { PageHero } from "@/components/shared/page-hero";
import { PhotoCredits } from "@/components/shared/photo-credits";
import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";
import {
  formatDuration,
  getCategories,
  getFeaturedPackages,
  isDayTour,
} from "@/modules/packages";
import { getDestinations } from "@/modules/destinations";

import { buildCategoryChips, type RailCard } from "../utils/category-chips";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { DestinationBento } from "./destination-bento";
import { PackageRail } from "./package-rail";
import { SearchForm } from "./search-form";
import { TrustStrip } from "./trust-strip";
import { WhatsAppCta } from "./whatsapp-cta";
import { WhyWayra } from "./why-wayra";

const HERO_SLIDES = 5;

// Entrada del texto del hero (keyframe wy-up de globals.css), escalonada por elemento.
const wyUp = "animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_both]";

type FeaturedPackage = Awaited<ReturnType<typeof getFeaturedPackages>>[number];

function slideContent(p: FeaturedPackage) {
  return (
    <>
      <span
        className={`${wyUp} inline-flex items-center gap-2 self-start rounded-full border border-white/28 bg-white/14 px-3.5 py-2 text-sm font-bold tracking-[0.08em] uppercase`}
      >
        <MapPin aria-hidden className="size-3.5" strokeWidth={2.4} />
        {p.destination.region}
      </span>
      <h1
        className={`${wyUp} text-[clamp(48px,8vw,104px)] leading-[0.92] text-balance [animation-delay:.08s]`}
      >
        {p.title}
      </h1>
      <p
        className={`${wyUp} max-w-[520px] text-[clamp(17px,1.6vw,20px)] leading-normal text-white/90 [animation-delay:.16s]`}
      >
        {p.blurb}
      </p>
      <div className={`${wyUp} mt-1 flex flex-wrap gap-3 [animation-delay:.24s]`}>
        <Button
          variant="cta"
          nativeButton={false}
          className="h-auto gap-2.5 px-[26px] py-4 text-base"
          render={<Link href={`/paquetes/${p.slug}`} />}
        >
          Ver paquete · desde {formatPen(p.priceCents)}
          <ArrowRight aria-hidden className="size-[18px]" strokeWidth={2.4} />
        </Button>
        <Link
          href="/paquetes"
          className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-white/70 px-6 py-[15px] text-base font-bold text-white transition-colors hover:bg-white/16"
        >
          Todos los paquetes
        </Link>
      </div>
    </>
  );
}

export async function HomePage() {
  const [featured, categories, destinations] = await Promise.all([
    getFeaturedPackages(12),
    getCategories(),
    getDestinations(),
  ]);

  const cards: RailCard[] = featured.map((p) => ({
    slug: p.slug,
    title: p.title,
    coverImageUrl: p.coverImageUrl,
    regionLabel: p.destination.region,
    tag: p.categories[0]?.name ?? null,
    durationLabel: formatDuration(p.durationDays),
    priceLabel: formatPen(p.priceCents),
    categorySlugs: p.categories.map((c) => c.slug),
    isDayTour: isDayTour(p),
  }));

  const slides: HeroCarouselSlide[] = featured
    .flatMap((p) =>
      p.coverImageUrl
        ? [
            {
              id: p.slug,
              imageUrl: p.coverImageUrl,
              label: p.title,
              ariaLabel: `Ver ${p.title}`,
              content: slideContent(p),
            },
          ]
        : [],
    )
    .slice(0, HERO_SLIDES);

  const whatsAppUrl = buildWhatsAppUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    "Hola Wayra, quiero planear un viaje a medida.",
  );

  return (
    <>
      {slides.length > 0 ? (
        // pb-28: 60 px de solapa del buscador + aire.
        <HeroCarousel
          slides={slides}
          label="Paquetes destacados"
          showNext
          className="min-h-[720px]"
          contentClassName="pb-28"
        />
      ) : (
        <PageHero className="min-h-[480px]" contentClassName="pb-28">
          <h1 className="text-balance">Wayra: paquetes y tours por todo el Perú</h1>
        </PageHero>
      )}
      <div className="relative z-10 mx-auto -mt-[60px] w-full max-w-[1240px] px-6">
        <SearchForm
          destinations={destinations.map(({ slug, name }) => ({ slug, name }))}
        />
        <TrustStrip />
      </div>
      {cards.length > 0 && (
        <PackageRail cards={cards} chips={buildCategoryChips(cards, categories)} />
      )}
      <DestinationBento
        destinations={destinations.map((d) => ({
          slug: d.slug,
          name: d.name,
          heroImageUrl: d.heroImageUrl,
          priceLabel: formatPen(d.minPriceCents),
        }))}
      />
      <WhyWayra />
      {whatsAppUrl && <WhatsAppCta href={whatsAppUrl} />}
      <PhotoCredits />
    </>
  );
}
