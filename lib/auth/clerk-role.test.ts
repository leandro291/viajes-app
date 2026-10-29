import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const updateUserMetadata = vi.fn();
const getUserList = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { getUser, updateUserMetadata, getUserList } }),
}));

import { ensureClerkRole, findClerkUserByEmail, getClerkRole, setClerkRole } from "./clerk-role";

beforeEach(() => {
  getUser.mockReset();
  updateUserMetadata.mockReset();
  getUserList.mockReset();
});

describe("ensureClerkRole", () => {
  it.each([{}, { role: "customer" }])(
    "AC5: sube a organizer cuando el rol actual es menor (%j)",
    async (publicMetadata) => {
      getUser.mockResolvedValue({ publicMetadata });
      await expect(ensureClerkRole("user_1", "organizer")).resolves.toBe("updated");
      expect(updateUserMetadata).toHaveBeenCalledWith("user_1", {
        publicMetadata: { role: "organizer" },
      });
    },
  );

  it.each(["organizer", "admin", "super_admin"])(
    "AC5: no escribe ni baja el rol si ya es %s",
    async (role) => {
      getUser.mockResolvedValue({ publicMetadata: { role } });
      await expect(ensureClerkRole("user_1", "organizer")).resolves.toBe("unchanged");
      expect(updateUserMetadata).not.toHaveBeenCalled();
    },
  );

  it("AC5: propaga el error de getUser", async () => {
    getUser.mockRejectedValue(new Error("boom"));
    await expect(ensureClerkRole("user_1", "organizer")).rejects.toThrow("boom");
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });

  it("AC5: propaga el error de updateUserMetadata", async () => {
    getUser.mockResolvedValue({ publicMetadata: {} });
    updateUserMetadata.mockRejectedValue(new Error("fail"));
    await expect(ensureClerkRole("user_1", "organizer")).rejects.toThrow("fail");
  });
});

const clerkUser = (id: string, emails: string[], publicMetadata: object = {}) => ({
  id,
  publicMetadata,
  emailAddresses: emails.map((emailAddress) => ({ emailAddress })),
});

describe("findClerkUserByEmail", () => {
  it("AC3: devuelve null sin resultados", async () => {
    getUserList.mockResolvedValue({ data: [] });
    await expect(findClerkUserByEmail("ana@x.com")).resolves.toBeNull();
    expect(getUserList).toHaveBeenCalledWith({ emailAddress: ["ana@x.com"], limit: 20 });
  });

  it("AC3: descarta coincidencias parciales", async () => {
    getUserList.mockResolvedValue({ data: [clerkUser("user_d", ["diana@x.com"])] });
    await expect(findClerkUserByEmail("ana@x.com")).resolves.toBeNull();
  });

  it("AC3: no distingue mayúsculas y devuelve id y rol", async () => {
    getUserList.mockResolvedValue({
      data: [
        clerkUser("user_d", ["diana@x.com"]),
        clerkUser("user_a", ["otro@x.com", "Ana@X.com"], { role: "organizer" }),
      ],
    });
    await expect(findClerkUserByEmail("ana@x.com")).resolves.toEqual({
      id: "user_a",
      role: "organizer",
    });
  });

  it("AC3: sin rol en metadata devuelve customer", async () => {
    getUserList.mockResolvedValue({ data: [clerkUser("user_a", ["ana@x.com"])] });
    await expect(findClerkUserByEmail("ana@x.com")).resolves.toEqual({
      id: "user_a",
      role: "customer",
    });
  });

  it("AC7: propaga el error de getUserList", async () => {
    getUserList.mockRejectedValue(new Error("boom"));
    await expect(findClerkUserByEmail("ana@x.com")).rejects.toThrow("boom");
  });
});

describe("getClerkRole", () => {
  it.each(["customer", "organizer", "admin", "super_admin"])(
    "AC6: mapea publicMetadata.role %s",
    async (role) => {
      getUser.mockResolvedValue({ publicMetadata: { role } });
      await expect(getClerkRole("user_1")).resolves.toBe(role);
    },
  );

  it("AC6: sin rol devuelve customer", async () => {
    getUser.mockResolvedValue({ publicMetadata: {} });
    await expect(getClerkRole("user_1")).resolves.toBe("customer");
  });

  it("AC7: propaga errores", async () => {
    getUser.mockRejectedValue(new Error("boom"));
    await expect(getClerkRole("user_1")).rejects.toThrow("boom");
  });
});

describe("setClerkRole", () => {
  it("AC4: llama updateUserMetadata con merge de publicMetadata.role", async () => {
    updateUserMetadata.mockResolvedValue({});
    await setClerkRole("user_1", "admin");
    expect(updateUserMetadata).toHaveBeenCalledWith("user_1", {
      publicMetadata: { role: "admin" },
    });
  });

  it("AC7: propaga errores", async () => {
    updateUserMetadata.mockRejectedValue(new Error("fail"));
    await expect(setClerkRole("user_1", "customer")).rejects.toThrow("fail");
  });
});
