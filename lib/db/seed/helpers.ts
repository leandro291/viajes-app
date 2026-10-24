import { createHash } from "node:crypto";

export const SEED_NAMESPACE: string = "5b0c2f4e-7a1d-4c3b-9e68-2d41f7a8c0b3";
export const SEED_ANCHOR = "2026-10-24" as const;
export const SEED_PEN_PER_USD: number = 3.75;

export function uuidV5(name: string, namespace: string): string {
  const nsBytes: Buffer = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash: Buffer = createHash("sha1")
    .update(nsBytes)
    .update(name, "utf8")
    .digest();
  const bytes: Buffer = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function seedId(key: string): string {
  return uuidV5(key, SEED_NAMESPACE);
}

export function limaDate(date: string, time: string = "00:00"): Date {
  return new Date(`${date}T${time}:00-05:00`);
}

export function soles(amount: number): number {
  return Math.round(amount * 100);
}

export function applyOffer(input: {
  unitCents: number;
  pax: number;
  discountType: "percent" | "two_for_one";
  discountValue: number | null;
  minPeople: number | null;
}): { discountedUnitCents: number; discountCents: number; totalCents: number } {
  const { unitCents, pax, discountType, discountValue, minPeople } = input;
  const baseCents: number = unitCents * pax;

  if (minPeople !== null && pax < minPeople) {
    return { discountedUnitCents: unitCents, discountCents: 0, totalCents: baseCents };
  }

  if (discountType === "two_for_one") {
    const paid: number = Math.ceil(pax / 2);
    const discountCents: number = (pax - paid) * unitCents;
    return {
      discountedUnitCents: unitCents,
      discountCents,
      totalCents: baseCents - discountCents,
    };
  }

  const discountedUnitCents: number =
    Math.floor((unitCents * (100 - (discountValue ?? 0)) + 5000) / 10000) * 100;
  const discountCents: number = (unitCents - discountedUnitCents) * pax;
  return { discountedUnitCents, discountCents, totalCents: baseCents - discountCents };
}

export function penToUsdCents(totalCents: number, penPerUsd: number): number {
  return Math.round(totalCents / penPerUsd);
}
