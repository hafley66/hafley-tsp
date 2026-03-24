import { describe, expect, it } from "vitest";
import { generateTsp, generateTs, generateStateKeys } from "./decorator-codegen.js";
import { asyncapiSpec } from "./decorator-spec.js";

describe("decorator-codegen", () => {
  it("generates .tsp declarations", () => {
    const tsp = generateTsp(asyncapiSpec);
    expect(tsp).toMatchSnapshot();
  });

  it("generates .ts factory-backed decorators", () => {
    const ts = generateTs(asyncapiSpec, "AsyncApiStateKeys");
    expect(ts).toMatchSnapshot();
  });

  it("generates state keys for lib.ts", () => {
    const keys = generateStateKeys(asyncapiSpec);
    expect(keys).toMatchSnapshot();
  });
});
