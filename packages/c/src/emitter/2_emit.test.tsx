import { compile, NodeHost } from "@typespec/compiler";
import { expect, it } from "vitest";
import { emitC } from "./2_emit.js";

it("emits scalars, structs, string tables, tagged unions and vtables", async () => {
  const program = await compile(NodeHost, new URL("../../test/fixtures/0_types.tsp", import.meta.url).pathname, { noEmit: true });
  expect(program.diagnostics).toEqual([]);
  expect(emitC(program)).toMatchSnapshot();
});
