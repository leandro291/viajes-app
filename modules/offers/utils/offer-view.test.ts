import { describe, expect, it } from "vitest";

import { formatPen } from "@/lib/money";

import type { OfferDto } from "../types/offer";
import { describeOffer, formatValidUntil } from "./offer-view";

function offer(over: Partial<OfferDto> & { priceCents: number }): OfferDto {
  const { priceCents, ...rest } = over;
  return {
    id: "o1",
    kind: "last_minute",
    discountType: "percent",
    discountValue: 20,
    minPeople: null,
    validUntil: "2026-12-01T04:59:00.000Z",
    package: {
      slug: "x",
      title: "X",
      durationDays: 1,
      priceCents,
      coverImageUrl: null,
      region: "Piura",
    },
    ...rest,
  };
}

describe("describeOffer", () => {
  it("AC3: Tambopata 165000 c / 25 %", () => {
    expect(
      describeOffer(offer({ priceCents: 165000, discountValue: 25, kind: "last_minute" })),
    ).toEqual({
      kindLabel: "Último minuto",
      badge: "-25%",
      badgeSub: "descuento",
      wasLabel: formatPen(165000),
      nowLabel: formatPen(123800),
      note: "Por persona",
      validUntilLabel: "30 de noviembre de 2026",
    });
    expect(formatPen(165000)).toBe("S/ 1 650");
    expect(formatPen(123800)).toBe("S/ 1 238");
  });

  it("AC3: Machu Picchu Mágico 129000 c / 15 % -> S/ 1 097", () => {
    const d = describeOffer(offer({ priceCents: 129000, discountValue: 15, kind: "rainy_season" }));
    expect(d.nowLabel).toBe(formatPen(109700));
    expect(d.kindLabel).toBe("Temporada de lluvias");
  });

  it("AC3: Islas Ballestas 9500 c / 2x1", () => {
    const d = describeOffer(
      offer({ priceCents: 9500, discountType: "two_for_one", discountValue: null }),
    );
    expect(d).toMatchObject({
      badge: "2x1",
      badgeSub: "paga uno",
      wasLabel: formatPen(19000),
      nowLabel: formatPen(9500),
      note: "Por dos personas",
    });
  });

  it("AC3: Paracas y Huacachina 52000 c / 20 % / mín. 4", () => {
    const d = describeOffer(offer({ priceCents: 52000, minPeople: 4, kind: "groups" }));
    expect(d).toMatchObject({
      kindLabel: "Grupos y familias",
      badge: "-20%",
      wasLabel: formatPen(52000),
      nowLabel: formatPen(41600),
      note: "Desde 4 personas",
    });
  });

  it("AC3: validUntilLabel es null sin vencimiento", () => {
    expect(describeOffer(offer({ priceCents: 6000, validUntil: null })).validUntilLabel).toBeNull();
  });
});

describe("formatValidUntil", () => {
  it("AC5: usa hora de Lima (04:59 UTC del día siguiente)", () => {
    expect(formatValidUntil("2026-12-01T04:59:00.000Z")).toBe("30 de noviembre de 2026");
  });

  it("AC5: mediodía UTC cae el mismo día", () => {
    expect(formatValidUntil("2026-12-01T12:00:00.000Z")).toBe("1 de diciembre de 2026");
  });
});
