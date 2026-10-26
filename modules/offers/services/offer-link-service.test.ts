import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfferDto } from "../types/offer";

const { getDepartures } = vi.hoisted(() => ({ getDepartures: vi.fn() }));
vi.mock("@/modules/packages", async () => ({
  getDepartures,
  buildCheckoutHref: (await vi.importActual<typeof import("@/modules/packages/utils/package-detail")>(
    "@/modules/packages/utils/package-detail",
  )).buildCheckoutHref,
}));

import { getOfferHrefs } from "./offer-link-service";

function offer(id: string, packageId: string, overrides: Partial<OfferDto> = {}): OfferDto {
  return {
    id,
    kind: "last_minute",
    discountType: "percent",
    discountValue: 20,
    minPeople: null,
    validUntil: null,
    package: {
      id: packageId,
      slug: `slug-${packageId}`,
      title: "Paquete",
      durationDays: 3,
      priceCents: 10000,
      coverImageUrl: null,
      region: "Cusco",
    },
    ...overrides,
  };
}

describe("getOfferHrefs", () => {
  beforeEach(() => getDepartures.mockReset());

  it("AC30: link a /pago con la primera salida con cupo, viajeros y oferta", async () => {
    getDepartures.mockResolvedValue([
      { id: "d1", seatsLeft: 1 },
      { id: "d2", seatsLeft: 5 },
    ]);
    const hrefs = await getOfferHrefs([offer("o1", "p1", { minPeople: 4 })]);
    expect(hrefs).toEqual({ o1: "/pago?salida=d2&viajeros=4&oferta=o1" });
  });

  it("AC30: sin salidas o sin cupo suficiente -> /paquetes/<slug>", async () => {
    getDepartures.mockImplementation(async (id: string) =>
      id === "p1" ? [] : [{ id: "d1", seatsLeft: 1 }],
    );
    const hrefs = await getOfferHrefs([offer("o1", "p1"), offer("o2", "p2")]);
    expect(hrefs).toEqual({ o1: "/paquetes/slug-p1", o2: "/paquetes/slug-p2" });
  });

  it("AC30: getDepartures se llama una vez por package.id distinto", async () => {
    getDepartures.mockResolvedValue([{ id: "d1", seatsLeft: 10 }]);
    await getOfferHrefs([offer("o1", "p1"), offer("o2", "p1"), offer("o3", "p2")]);
    expect(getDepartures).toHaveBeenCalledTimes(2);
  });
});
