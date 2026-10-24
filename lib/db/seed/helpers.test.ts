import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyOffer,
  limaDate,
  penToUsdCents,
  seedId,
  soles,
  uuidV5,
} from "./helpers";
import { SEED_IMAGES } from "./images";

const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuid", () => {
  it("AC9: uuidV5 reproduce el vector conocido del namespace DNS", () => {
    expect(uuidV5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(
      "2ed6657d-e927-568b-95e1-2665a8aea6a2",
    );
  });

  it("AC9: seedId es determinista y devuelve uuid v5 válido", () => {
    expect(seedId("package:tambopata")).toBe(seedId("package:tambopata"));
    expect(seedId("package:tambopata")).toMatch(UUID_V5);
  });

  it("AC9: claves distintas dan ids distintos", () => {
    expect(seedId("package:a")).not.toBe(seedId("package:b"));
  });
});

describe("applyOffer", () => {
  const percent = (unitCents: number, value: number, pax = 1, minPeople: number | null = null) =>
    applyOffer({ unitCents, pax, discountType: "percent", discountValue: value, minPeople });

  it.each([
    ["Tambopata", 165000, 25, 123800],
    ["Machu Picchu Mágico", 129000, 15, 109700],
    ["Máncora", 98000, 30, 68600],
    ["Titicaca", 89000, 20, 71200],
    ["Colca", 74000, 10, 66600],
    ["Laguna 69", 86000, 15, 73100],
  ])("AC10: %s %i al %i %% -> unitario %i", (_name, unit, value, expected) => {
    expect(percent(unit, value).discountedUnitCents).toBe(expected);
  });

  it("AC10: Paracas 20 % con 5 pax aplica y con 3 pax (mínimo 4) no", () => {
    expect(percent(52000, 20, 5, 4).discountedUnitCents).toBe(41600);
    const without = percent(52000, 20, 3, 4);
    expect(without.discountCents).toBe(0);
    expect(without.totalCents).toBe(52000 * 3);
  });

  it("AC10: percent calcula descuento y total por pax", () => {
    expect(percent(165000, 25, 2)).toEqual({
      discountedUnitCents: 123800,
      discountCents: 41200 * 2,
      totalCents: 123800 * 2,
    });
  });

  it("AC10: Ballestas 2x1 con 2 pax y con 3 pax", () => {
    const base = { unitCents: 9500, discountType: "two_for_one", discountValue: null, minPeople: null } as const;
    const two = applyOffer({ ...base, pax: 2 });
    expect(two.discountCents).toBe(9500);
    expect(two.totalCents).toBe(9500);
    expect(applyOffer({ ...base, pax: 3 }).totalCents).toBe(19000);
  });

  it("AC10: penToUsdCents(247600, 3.75) = 66027", () => {
    expect(penToUsdCents(247600, 3.75)).toBe(66027);
  });
});

describe("fechas y montos", () => {
  it("AC9: limaDate convierte America/Lima (UTC-5) a UTC", () => {
    expect(limaDate("2026-11-05", "07:30").toISOString()).toBe("2026-11-05T12:30:00.000Z");
    expect(limaDate("2026-11-05").toISOString()).toBe("2026-11-05T05:00:00.000Z");
  });

  it("AC9: soles convierte a céntimos", () => {
    expect(soles(1290)).toBe(129000);
  });
});

describe("SEED_IMAGES", () => {
  const keys = Object.keys(SEED_IMAGES) as (keyof typeof SEED_IMAGES)[];

  it("AC15: tiene exactamente 18 claves", () => {
    expect(keys).toHaveLength(18);
  });

  it("AC15: cada path es /seed/<key>.jpg y tiene crédito", () => {
    for (const key of keys) {
      expect(SEED_IMAGES[key].path).toBe(`/seed/${key}.jpg`);
      expect(SEED_IMAGES[key].credit).not.toBe("");
    }
  });

  it("AC15: cada archivo existe en public/seed/", () => {
    for (const key of keys) {
      expect(existsSync(join(process.cwd(), "public", SEED_IMAGES[key].path))).toBe(true);
    }
  });
});
