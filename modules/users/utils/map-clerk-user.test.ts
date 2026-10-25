import { describe, expect, it } from "vitest";

import { mapClerkUser } from "./map-clerk-user";

type ClerkUser = Parameters<typeof mapClerkUser>[0];

const clerkUser = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "user_1",
    first_name: "Ana",
    last_name: "Quispe",
    primary_email_address_id: "idn_2",
    primary_phone_number_id: null,
    email_addresses: [
      { id: "idn_1", email_address: "otro@wayra.test" },
      { id: "idn_2", email_address: "ana@wayra.test" },
    ],
    phone_numbers: [],
    public_metadata: {},
    ...overrides,
  }) as unknown as ClerkUser;

describe("mapClerkUser", () => {
  it("usa el correo principal, no el primero de la lista", () => {
    expect(mapClerkUser(clerkUser())).toMatchObject({
      clerkId: "user_1",
      email: "ana@wayra.test",
      firstName: "Ana",
      lastName: "Quispe",
    });
  });

  it("devuelve null sin correo principal", () => {
    expect(mapClerkUser(clerkUser({ primary_email_address_id: null }))).toBeNull();
  });

  it("toma el teléfono principal y null si no hay", () => {
    const phones = [
      { id: "ph_1", phone_number: "+51111111111" },
      { id: "ph_2", phone_number: "+51999999999" },
    ];
    expect(mapClerkUser(clerkUser({ phone_numbers: phones, primary_phone_number_id: "ph_2" }))?.phone).toBe(
      "+51999999999",
    );
    expect(mapClerkUser(clerkUser())?.phone).toBeNull();
  });

  it("el rol sale de public_metadata; sin rol o inválido es customer", () => {
    expect(mapClerkUser(clerkUser({ public_metadata: { role: "organizer" } }))?.role).toBe("organizer");
    expect(mapClerkUser(clerkUser())?.role).toBe("customer");
    expect(mapClerkUser(clerkUser({ public_metadata: { role: "root" } }))?.role).toBe("customer");
  });
});
