import { getActiveOffers } from "../services/offer-service";
import { describeOffer } from "../utils/offer-view";
import { OfferHeroCarousel } from "./offer-hero-carousel";
import type { OfferSlide } from "./offer-hero-carousel";

const HERO_SLIDES = 4;

export async function OfferHero() {
  // El service ya ordena con compareOffers (D3): las primeras son las de mayor descuento.
  const offers = (await getActiveOffers()).slice(0, HERO_SLIDES);
  if (offers.length === 0) return null;

  const slides: OfferSlide[] = offers.map((offer) => {
    const { kindLabel, badge, badgeSub, wasLabel, nowLabel, note, validUntilLabel } =
      describeOffer(offer);
    return {
      slug: offer.package.slug,
      title: offer.package.title,
      coverImageUrl: offer.package.coverImageUrl,
      kindLabel,
      place: offer.package.region,
      badge,
      badgeSub,
      wasLabel,
      nowLabel,
      note,
      validUntilLabel,
    };
  });

  return <OfferHeroCarousel slides={slides} />;
}
