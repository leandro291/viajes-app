import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeEmail } from "../services/newsletter-service";
import type { SubscribeState } from "../types/newsletter";
import { subscribeToNewsletter } from "./subscribe-action";

vi.mock("../services/newsletter-service", () => ({ subscribeEmail: vi.fn() }));

const idle: SubscribeState = { status: "idle", message: "" };
const form = (email?: string) => {
  const fd = new FormData();
  if (email !== undefined) fd.set("email", email);
  return fd;
};

describe("subscribeToNewsletter", () => {
  beforeEach(() => {
    vi.mocked(subscribeEmail).mockReset();
    vi.mocked(subscribeEmail).mockResolvedValue(undefined);
  });

  it("AC12: correo inválido devuelve error con el correo escrito y no llama al service", async () => {
    const state = await subscribeToNewsletter(idle, form(" ana@ "));
    expect(state).toEqual({
      status: "error",
      message: "Ingresa un correo válido",
      email: " ana@ ",
    });
    expect(subscribeEmail).not.toHaveBeenCalled();
  });

  it("AC12: campo ausente devuelve error sin lanzar ni llamar al service", async () => {
    const state = await subscribeToNewsletter(idle, form());
    expect(state).toEqual({ status: "error", message: "Ingresa tu correo", email: undefined });
    expect(subscribeEmail).not.toHaveBeenCalled();
  });

  it("AC12: correo válido llama una vez al service con el correo normalizado", async () => {
    const state = await subscribeToNewsletter(idle, form("  Ana@Correo.COM "));
    expect(subscribeEmail).toHaveBeenCalledTimes(1);
    expect(subscribeEmail).toHaveBeenCalledWith("ana@correo.com");
    expect(state).toEqual({
      status: "success",
      message: "¡Listo! Te avisaremos cuando haya nuevas ofertas.",
    });
  });

  it("AC12: dos llamadas con el mismo correo devuelven el mismo éxito", async () => {
    const first = await subscribeToNewsletter(idle, form("ana@correo.com"));
    const second = await subscribeToNewsletter(first, form("ana@correo.com"));
    expect(second).toEqual(first);
    expect(second.status).toBe("success");
  });

  it("AC12: si el service lanza devuelve error genérico sin propagar ni loguear el correo", async () => {
    vi.mocked(subscribeEmail).mockRejectedValue(new Error("db down: ana@correo.com"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = await subscribeToNewsletter(idle, form("ana@correo.com"));

    expect(state).toEqual({
      status: "error",
      message: "No pudimos suscribirte. Inténtalo de nuevo en unos minutos.",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("ana@correo.com");
    errorSpy.mockRestore();
  });
});
