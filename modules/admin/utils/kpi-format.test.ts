import { describe, expect, it } from "vitest";
import { formatPen } from "@/lib/money";
import { formatMoneyOrDash, formatRate } from "./kpi-format";

describe("formatRate", () => {
  it("AC6/AC11: null -> guion", () => {
    expect(formatRate(null)).toBe("—");
  });
  it("AC6: 0 -> '0 %'", () => {
    expect(formatRate(0)).toBe("0 %");
  });
  it("AC6: conserva 1 decimal", () => {
    expect(formatRate(8.3)).toBe("8.3 %");
  });
  it("AC6: sin .0 en enteros", () => {
    expect(formatRate(12)).toBe("12 %");
    expect(formatRate(12.0)).toBe("12 %");
    expect(formatRate(100)).toBe("100 %");
  });
});

describe("formatMoneyOrDash", () => {
  it("AC5/AC11: null -> guion (nunca S/ 0)", () => {
    expect(formatMoneyOrDash(null)).toBe("—");
  });
  it("AC11: 0 -> S/ 0", () => {
    expect(formatMoneyOrDash(0)).toBe(formatPen(0));
    expect(formatMoneyOrDash(0)).toContain("S/");
  });
  it("AC5: delega en formatPen", () => {
    expect(formatMoneyOrDash(129050)).toBe(formatPen(129050));
  });
});
