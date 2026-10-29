import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const updateUserMetadata = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { getUser, updateUserMetadata } }),
}));

import { ensureClerkRole } from "./clerk-role";

beforeEach(() => {
  getUser.mockReset();
  updateUserMetadata.mockReset();
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
