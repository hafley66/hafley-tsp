import { compile, NodeHost } from "@typespec/compiler";
import { expect, it } from "vitest";
import { emitC } from "../src/emitter/2_emit.js";

it("emits arena JSON wrappers for model and union codecs", async () => {
  const program = await compile(NodeHost, new URL("./fixtures/wire/main.tsp", import.meta.url).pathname, { noEmit: true });
  expect(program.diagnostics).toEqual([]);
  const files = emitC(program, { wire: true });
  const source = files.find(f => f.path === "wire_auto.c")!.contents;
  const start = source.indexOf("char *Message_json_encode");
  const end = source.indexOf("\n\n", start);
  expect(source.slice(start, end)).toMatchInlineSnapshot(`""`);
  expect(source).toContain('strcmp(yyjson_get_str(tag), "message")');
  expect(source).toContain("yyjson_arr_get");
  expect(source).toContain("INT64_MAX");
  const state = files.find(f => f.path === "Fixture/State_auto.c")!.contents;
  expect(state).toContain('State_in_progress, "in-progress"');
});
