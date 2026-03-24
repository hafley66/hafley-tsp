import { describe, expect, it } from "vitest";
import { generateTsp, generateTs, generateStateKeys, type LibrarySpec } from "./decorator-codegen.js";

const testSpec: LibrarySpec = {
  namespace: "TestLib",
  decorators: [
    {
      name: "tag",
      targets: "Model",
      shape: "value",
      doc: "Tag a model.",
      params: [{ name: "value", type: "string" }],
    },
    {
      name: "mark",
      targets: "ModelProperty",
      shape: "flag",
    },
    {
      name: "on",
      targets: "Operation",
      shape: "exclusive",
      exclusiveKey: "mode",
      exclusiveValue: "on",
    },
    {
      name: "off",
      targets: "Operation",
      shape: "exclusive",
      exclusiveKey: "mode",
      exclusiveValue: "off",
    },
    {
      name: "meta",
      targets: "Operation",
      shape: "object",
      options: [
        { name: "label", type: "string" },
        { name: "priority", type: "int32" },
      ],
    },
    {
      name: "hook",
      targets: "Namespace",
      shape: "list",
      params: [{ name: "name", type: "string" }],
    },
  ],
};

describe("decorator-codegen", () => {
  it("generates .tsp declarations", () => {
    expect(generateTsp(testSpec)).toMatchSnapshot();
  });

  it("generates .ts factory-backed decorators", () => {
    expect(generateTs(testSpec, "TestLibStateKeys")).toMatchSnapshot();
  });

  it("generates state keys", () => {
    expect(generateStateKeys(testSpec)).toMatchSnapshot();
  });
});
