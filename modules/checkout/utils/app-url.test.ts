import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "./app-url";

afterEach(() => vi.unstubAllEnvs());

describe("getAppUrl", () => {
  it.each([
    ["https://wayra.example/", "https://wayra.example"],
    [" https://wayra.example ", "https://wayra.example"],
    ["http://localhost:3000", "http://localhost:3000"],
  ])("AC16: %j -> %s", (input, expected) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", input);
    expect(getAppUrl()).toBe(expected);
  });

  it.each([undefined, "", "   ", "wayra.example", "ftp://x", "basura !!"])(
    "AC16: %j lanza Error que nombra NEXT_PUBLIC_APP_URL",
    (input) => {
      if (input === undefined) vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
      else vi.stubEnv("NEXT_PUBLIC_APP_URL", input);
      expect(() => getAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
    },
  );

  it("AC16: se lee en cada llamada", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://a.example");
    expect(getAppUrl()).toBe("https://a.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://b.example");
    expect(getAppUrl()).toBe("https://b.example");
  });
});
