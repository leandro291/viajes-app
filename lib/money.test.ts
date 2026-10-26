import { describe, expect, it } from "vitest";

import { formatPen, formatUsd } from "./money";

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

const U = "US$\u00a0";

describe("formatUsd", () => {
  it.each([
    [34500, `${U}345.00`],
    [103200, `${U}1${T}032.00`],
    [50, `${U}0.50`],
    [5, `${U}0.05`],
    [0, `${U}0.00`],
  ])("AC2: %i -> %s", (cents, expected) => {
    expect(formatUsd(cents)).toBe(expected);
  });

  it("AC2: usa U+00A0 tras US$ y U+202F como separador de miles", () => {
    const out = formatUsd(103200);
    expect(out.charCodeAt(3)).toBe(0x00a0);
    expect(out.charCodeAt(5)).toBe(0x202f);
    expect(out).not.toContain(" ");
  });
});
