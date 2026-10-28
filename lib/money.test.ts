import { describe, expect, it } from "vitest";

import {
  centsToSolesInput,
  formatPen,
  formatUsd,
  parseSolesToCents,
} from "./money";

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

describe("parseSolesToCents", () => {
  it.each([
    ["1290", 129000],
    ["1290.5", 129050],
    ["1290.50", 129050],
    ["1290,50", 129050],
    ["1290,5", 129050],
    [" 95 ", 9500],
    ["19.99", 1999],
    ["0.07", 7],
    ["0", 0],
  ])("AC12: %j -> %i", (input, expected) => {
    expect(parseSolesToCents(input)).toBe(expected);
  });

  it.each([
    "",
    "  ",
    "abc",
    "-5",
    "1.234",
    "1,234",
    "1.",
    ".5",
    "1.2.3",
    "1e3",
    "99999999999999999999",
  ])("AC12: %j -> null", (input) => {
    expect(parseSolesToCents(input)).toBeNull();
  });
});

describe("centsToSolesInput", () => {
  it.each([
    [129000, "1290"],
    [12050, "120.50"],
    [9500, "95"],
    [7, "0.07"],
    [0, "0"],
  ])("AC12: %i -> %s", (cents, expected) => {
    expect(centsToSolesInput(cents)).toBe(expected);
  });

  it("AC12: ida y vuelta", () => {
    for (const c of [0, 1, 7, 99, 100, 1999, 9500, 12050, 129000]) {
      expect(parseSolesToCents(centsToSolesInput(c))).toBe(c);
    }
  });
});
