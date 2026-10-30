import { describe, expect, it } from "vitest";

import type { OrganizerStatus } from "../types/organizer";
import type { OperatorTarget } from "../types/organizer-manage";
import { getStatusChange } from "./status-change";

const STATUSES: OrganizerStatus[] = ["pending", "active", "suspended"];
const TARGETS: OperatorTarget[] = ["active", "suspended"];

describe("getStatusChange", () => {
  it.each(STATUSES.flatMap((s) => TARGETS.map((t) => [s, t] as const)))(
    "AC3/AC4/AC6: %s -> %s",
    (current, target) => {
      if (current === target) {
        expect(getStatusChange(current, target)).toEqual({ kind: "noop" });
      } else {
        expect(getStatusChange(current, target)).toEqual({
          kind: "change",
          ensureRole: target === "active",
        });
      }
    },
  );
});
