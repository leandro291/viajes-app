import { formatPen } from "@/lib/money";
import {
  formatDuration,
  getCategories,
  getFeaturedPackages,
  isDayTour,
} from "@/modules/packages";
import { getDestinations } from "@/modules/destinations";

import { buildCategoryChips, type RailCard } from "../utils/category-chips";
import { buildWhatsAppUrl } from "../utils/whatsapp";
import { DestinationBento } from "./destination-bento";
import { HeroCarousel, type HeroSlide } from "./hero-carousel";
import { PackageRail } from "./package-rail";
import { PhotoCredits } from "./photo-credits";
import { SearchForm } from "./search-form";
import { TrustStrip } from "./trust-strip";
import { WhatsAppCta } from "./whatsapp-cta";
import { WhyWayra } from "./why-wayra";

const HERO_SLIDES = 5;

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

  const slides: HeroSlide[] = featured
    .flatMap((p) =>
      p.coverImageUrl
        ? [
            {
              slug: p.slug,
              title: p.title,
              blurb: p.blurb,
              regionLabel: p.destination.region,
              priceLabel: formatPen(p.priceCents),
              coverImageUrl: p.coverImageUrl,
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
      <h1 className="sr-only">Wayra: paquetes y tours por todo el Perú</h1>
      {slides.length > 0 && <HeroCarousel slides={slides} />}
      <SearchForm
        destinations={destinations.map(({ slug, name }) => ({ slug, name }))}
      />
      <TrustStrip />
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
      {whatsAppUrl && (
        <div className="py-8">
          <WhatsAppCta href={whatsAppUrl} />
        </div>
      )}
      <PhotoCredits />
    </>
  );
}
