import { expect, it } from "vitest";
import { cIdentifier, assertDistinctIdentifiers } from "../src/c/0_name-policy.js";

it("maps only identifier hyphens and rejects collisions", () => {
  expect(["backfill-spawned-edge", "user_id"].map(cIdentifier)).toMatchInlineSnapshot(`
    [
      "backfill_spawned_edge",
      "user_id",
    ]
  `);
  expect(() => assertDistinctIdentifiers(["a-b", "a_b"], "Status")).toThrow("C identifier collision in Status: a_b");
});
