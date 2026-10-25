import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function load() {
  return import("./stripe");
}

describe("getStripe", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC2: importar sin STRIPE_SECRET_KEY no lanza", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    await expect(load()).resolves.toBeDefined();
  });

  it.each([
    ["vacía", ""],
    ["solo espacios", "   "],
  ])("AC2: lanza nombrando STRIPE_SECRET_KEY si la clave es %s", async (_, value) => {
    vi.stubEnv("STRIPE_SECRET_KEY", value);
    const { getStripe } = await load();
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("AC2: lanza nombrando STRIPE_SECRET_KEY si la variable falta", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", undefined);
    const { getStripe } = await load();
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("AC2: con una clave de prueba devuelve la misma instancia de Stripe", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    const { getStripe } = await load();
    const first = getStripe();
    expect(first).toBeInstanceOf(Stripe);
    expect(getStripe()).toBe(first);
  });
});
