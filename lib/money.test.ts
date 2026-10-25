import { describe, expect, it } from "vitest";

import { formatPen } from "./money";

const S = "S/ ";
const T = " ";

describe("formatPen", () => {
  it.each([
    [129000, `${S}1${T}290`],
    [9500, `${S}95`],
    [12050, `${S}120.50`],
    [0, `${S}0`],
    [165000, `${S}1${T}650`],
    [100000000, `${S}1${T}000${T}000`],
  ])("AC3: %i -> %s", (cents, expected) => {
    expect(formatPen(cents)).toBe(expected);
  });

  it("AC3: usa U+00A0 tras S/ y U+202F como separador de miles", () => {
    const out = formatPen(129000);
    expect(out.charCodeAt(2)).toBe(0x00a0);
    expect(out.charCodeAt(4)).toBe(0x202f);
    expect(out).not.toContain(" ");
  });

  it("AC3: 2 decimales con cero a la izquierda", () => {
    expect(formatPen(12005)).toBe(`${S}120.05`);
  });
});
