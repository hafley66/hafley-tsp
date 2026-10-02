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
  expect(source.slice(start, end)).toMatchInlineSnapshot(`
    "char *Message_json_encode(mi_heap_t *arena, const Message *input) {
      if (!arena) return NULL;
      yyjson_alc alc = alloy_c_json_allocator(arena);
      yyjson_mut_doc *doc = yyjson_mut_doc_new(&alc);
      if (!doc) return NULL;
      yyjson_mut_val *value = Message_json_value(doc, input);
      if (!value) return NULL;
      yyjson_mut_doc_set_root(doc, value);
      return yyjson_mut_write_opts(doc, 0, &alc, NULL, NULL);
    }"
  `);
  expect(source).toContain('strcmp(yyjson_get_str(tag), "message")');
  expect(source).toContain("yyjson_arr_get");
  expect(source).toContain("INT64_MAX");
  const state = files.find(f => f.path === "Fixture/State_auto.c")!.contents;
  expect(state).toContain('State_in_progress, "in-progress"');
});
