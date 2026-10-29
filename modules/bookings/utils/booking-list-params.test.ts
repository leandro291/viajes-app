import { describe, expect, it } from "vitest";

import type { BookingListQuery } from "../types/booking-list";
import {
  BOOKINGS_PAGE_SIZE,
  DEFAULT_BOOKING_QUERY,
  buildBookingsHref,
  nextSortQuery,
  parseBookingListParams,
} from "./booking-list-params";

describe("parseBookingListParams", () => {
  it("AC1: sin parámetros devuelve los defaults", () => {
    expect(parseBookingListParams({})).toEqual({ orden: "codigo", dir: "desc", pagina: 1 });
    expect(parseBookingListParams({})).toEqual(DEFAULT_BOOKING_QUERY);
  });

  it("AC1: acepta valores válidos", () => {
    for (const estado of ["pending", "confirmed", "cancelled"] as const) {
      expect(parseBookingListParams({ estado }).estado).toBe(estado);
    }
    expect(
      parseBookingListParams({ estado: "confirmed", orden: "total", dir: "asc", pagina: "3" }),
    ).toEqual({ estado: "confirmed", orden: "total", dir: "asc", pagina: 3 });
    expect(parseBookingListParams({ orden: "salida" }).orden).toBe("salida");
  });

  it("AC1: inválidos y vacíos caen al default sin lanzar", () => {
    expect(
      parseBookingListParams({ estado: "foo", orden: "precio", dir: "up", pagina: "abc" }),
    ).toEqual(DEFAULT_BOOKING_QUERY);
    expect(
      parseBookingListParams({ estado: "", orden: "", dir: "", pagina: "" }),
    ).toEqual(DEFAULT_BOOKING_QUERY);
    expect(
      parseBookingListParams({ estado: undefined, orden: [], dir: undefined, pagina: [] }),
    ).toEqual(DEFAULT_BOOKING_QUERY);
  });

  it("AC1: pagina debe ser entero >= 1", () => {
    for (const pagina of ["0", "-1", "2.5", "1e3", " 2", "NaN", "99999999999999999999"]) {
      expect(parseBookingListParams({ pagina }).pagina).toBe(1);
    }
    expect(parseBookingListParams({ pagina: "999" }).pagina).toBe(999);
  });

  it("AC1: repetidos toman el primero", () => {
    expect(parseBookingListParams({ estado: ["pending", "confirmed"] }).estado).toBe("pending");
    expect(parseBookingListParams({ estado: ["foo", "pending"] }).estado).toBeUndefined();
    expect(parseBookingListParams({ pagina: ["4", "2"] }).pagina).toBe(4);
    expect(parseBookingListParams({ dir: ["asc", "desc"] }).dir).toBe("asc");
  });

  it("AC1: sin estado no incluye la clave", () => {
    expect("estado" in parseBookingListParams({})).toBe(false);
  });
});

describe("buildBookingsHref", () => {
  const base = "/operador/reservas";

  it("AC2: query por defecto → basePath sin ?", () => {
    expect(buildBookingsHref(base, DEFAULT_BOOKING_QUERY)).toBe(base);
  });

  it("AC2: omite defaults y arma solo lo distinto", () => {
    expect(buildBookingsHref(base, { ...DEFAULT_BOOKING_QUERY, estado: "pending" })).toBe(
      `${base}?estado=pending`,
    );
    expect(buildBookingsHref(base, { ...DEFAULT_BOOKING_QUERY, pagina: 2 })).toBe(
      `${base}?pagina=2`,
    );
    expect(buildBookingsHref(base, { ...DEFAULT_BOOKING_QUERY, dir: "asc" })).toBe(
      `${base}?dir=asc`,
    );
  });

  it("AC2: orden fijo de claves estado, orden, dir, pagina", () => {
    expect(
      buildBookingsHref(base, { pagina: 3, dir: "asc", orden: "total", estado: "cancelled" }),
    ).toBe(`${base}?estado=cancelled&orden=total&dir=asc&pagina=3`);
  });

  it("AC2: round-trip con parseBookingListParams", () => {
    const queries: BookingListQuery[] = [
      DEFAULT_BOOKING_QUERY,
      { estado: "confirmed", orden: "salida", dir: "asc", pagina: 5 },
      { orden: "total", dir: "desc", pagina: 2 },
      { estado: "pending", orden: "codigo", dir: "asc", pagina: 1 },
    ];
    for (const query of queries) {
      const href = buildBookingsHref(base, query);
      const raw = Object.fromEntries(new URL(href, "http://x").searchParams);
      expect(parseBookingListParams(raw)).toEqual(query);
    }
  });
});

describe("nextSortQuery", () => {
  it("AC3: misma columna invierte dir", () => {
    expect(nextSortQuery({ orden: "codigo", dir: "desc", pagina: 1 }, "codigo").dir).toBe("asc");
    expect(nextSortQuery({ orden: "codigo", dir: "asc", pagina: 1 }, "codigo").dir).toBe("desc");
    expect(nextSortQuery({ orden: "salida", dir: "asc", pagina: 1 }, "salida").dir).toBe("desc");
  });

  it("AC3: otra columna usa su dirección inicial", () => {
    const from = (dir: "asc" | "desc"): BookingListQuery => ({ orden: "codigo", dir, pagina: 1 });
    expect(nextSortQuery(from("asc"), "salida")).toMatchObject({ orden: "salida", dir: "asc" });
    expect(nextSortQuery(from("asc"), "total")).toMatchObject({ orden: "total", dir: "desc" });
    expect(nextSortQuery({ orden: "total", dir: "asc", pagina: 1 }, "codigo")).toMatchObject({
      orden: "codigo",
      dir: "desc",
    });
  });

  it("AC3: reinicia pagina a 1 y conserva estado", () => {
    const query: BookingListQuery = { estado: "pending", orden: "codigo", dir: "desc", pagina: 4 };
    expect(nextSortQuery(query, "codigo")).toEqual({
      estado: "pending",
      orden: "codigo",
      dir: "asc",
      pagina: 1,
    });
    expect(nextSortQuery(query, "total")).toEqual({
      estado: "pending",
      orden: "total",
      dir: "desc",
      pagina: 1,
    });
  });

  it("AC3: sin estado no lo agrega y no muta la query", () => {
    const query: BookingListQuery = { orden: "codigo", dir: "desc", pagina: 2 };
    const next = nextSortQuery(query, "salida");
    expect("estado" in next).toBe(false);
    expect(query.pagina).toBe(2);
  });
});

describe("BOOKINGS_PAGE_SIZE", () => {
  it("AC11: es 20", () => {
    expect(BOOKINGS_PAGE_SIZE).toBe(20);
  });
});
