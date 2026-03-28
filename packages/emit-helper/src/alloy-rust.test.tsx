import { describe, it, expect } from "vitest";
import { Output, render } from "@alloy-js/core";
import type { TypeDef } from "./0_types.js";
import { emitAll } from "./2_walk.js";
import { createAlloyRustTarget, buildRegistry } from "./5_alloy-rust.js";

const USER: TypeDef = {
  kind: "model",
  name: "User",
  fields: [
    { name: "id", type: { kind: "scalar", name: "int64" } },
    { name: "name", type: { kind: "scalar", name: "string" } },
    { name: "email", type: { kind: "scalar", name: "string" } },
    { name: "age", type: { kind: "scalar", name: "int32" }, optional: true },
  ],
};

const STATUS: TypeDef = {
  kind: "enum",
  name: "PostStatus",
  members: [
    { name: "Draft" },
    { name: "Published" },
    { name: "Archived" },
  ],
};

const POST: TypeDef = {
  kind: "model",
  name: "BlogPost",
  fields: [
    { name: "id", type: { kind: "scalar", name: "int64" } },
    { name: "title", type: { kind: "scalar", name: "string" } },
    { name: "author", type: { kind: "model", name: "User" } },
    { name: "status", type: { kind: "enum", name: "PostStatus" }, optional: true },
    { name: "tags", type: { kind: "array", element: { kind: "scalar", name: "string" } } },
    { name: "created_at", type: { kind: "scalar", name: "utcDateTime" } },
  ],
};

const ALL_TYPES: TypeDef[] = [USER, STATUS, POST];

describe("alloy rust target", () => {
  it("produces AlloyRustDecl with refkeys and uses", () => {
    const registry = buildRegistry(ALL_TYPES);
    const target = createAlloyRustTarget(registry);
    const decls = emitAll(ALL_TYPES, target);

    expect(decls).toHaveLength(3);

    // User model
    const user = decls[0];
    expect(user.name).toBe("User");
    expect(user.refkey).toBe(registry.get("User"));
    expect(user.uses).toMatchInlineSnapshot(`
      [
        "serde::Deserialize",
        "serde::Serialize",
      ]
    `);

    // PostStatus enum
    const status = decls[1];
    expect(status.name).toBe("PostStatus");
    expect(status.refkey).toBe(registry.get("PostStatus"));

    // BlogPost model with cross-refs and datetime
    const post = decls[2];
    expect(post.name).toBe("BlogPost");
    expect(post.uses).toMatchInlineSnapshot(`
      [
        "chrono::DateTime",
        "chrono::Utc",
        "serde::Deserialize",
        "serde::Serialize",
      ]
    `);
  });

  it("ref() returns the pre-allocated refkey from registry", () => {
    const registry = buildRegistry(ALL_TYPES);
    const target = createAlloyRustTarget(registry);

    const userRef = target.ref("User");
    expect(userRef.code).toBe(registry.get("User"));
    expect(userRef.uses).toEqual([]);
  });

  it("renders through Alloy Output", () => {
    const registry = buildRegistry([USER]);
    const target = createAlloyRustTarget(registry);
    const [decl] = emitAll([USER], target);

    // Wrap in Alloy Output and render to verify JSX is valid
    const tree = (
      <Output>
        {decl.jsx}
      </Output>
    );
    const result = render(tree);

    // Result should be a rendered tree with content
    expect(result).toBeTruthy();
    expect(result.contents).toBeTruthy();
  });
});
