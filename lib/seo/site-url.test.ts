import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("AC1: devuelve el origen de una URL válida", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://wayra.pe");
    expect(getSiteUrl()).toBe("https://wayra.pe");
  });

  it("AC1: quita la barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://wayra.pe/");
    expect(getSiteUrl()).toBe("https://wayra.pe");
  });

  it("AC1: ignora espacios alrededor", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "  https://wayra.pe/  ");
    expect(getSiteUrl()).toBe("https://wayra.pe");
  });

  it("AC1: URL inválida cae a VERCEL_PROJECT_PRODUCTION_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "no-es-url");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "wayra.vercel.app");
    expect(getSiteUrl()).toBe("https://wayra.vercel.app");
  });

  it("AC1: protocolo no http(s) cae al fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "ftp://wayra.pe");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("AC1: ausente + VERCEL_PROJECT_PRODUCTION_URL", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "wayra.vercel.app");
    expect(getSiteUrl()).toBe("https://wayra.vercel.app");
  });

  it("AC1: ausente total devuelve localhost y no lanza", () => {
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
