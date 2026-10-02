import { compile, NodeHost } from "@typespec/compiler";
import { programToOps } from "@hafley/emit-helper/http";
import { expect, it } from "vitest";
import { emitCli } from "../src/emitter/7_cli.js";

it("projects shared HTTP routes into typed handler dispatch", async () => {
  const program = await compile(NodeHost, new URL("./fixtures/cli/main.tsp", import.meta.url).pathname, { noEmit: true });
  expect(program.diagnostics).toEqual([]);
  const files = emitCli(programToOps(program));
  const header = files[0].contents;
  expect(header.slice(header.indexOf("typedef struct Fixture_ops"))).toMatchInlineSnapshot(`
    "typedef struct Fixture_ops {
      int (*read_entry)(void *self, mi_heap_t *arena, const Fixture_root_args *root, const Fixture_read_entry_args *args, FILE *input);
      int (*write_entry)(void *self, mi_heap_t *arena, const Fixture_root_args *root, const Fixture_write_entry_args *args, FILE *input);
    } Fixture_ops;
    #define Fixture_ops_init(read_entry, write_entry) ((Fixture_ops){ read_entry, write_entry })
    int Fixture_cli_parse(mi_heap_t *arena, int argc, char **argv, Fixture_request *request, FILE *input, FILE *err);
    int Fixture_cli_dispatch(const Fixture_ops *ops, void *self, mi_heap_t *arena, const Fixture_request *request, FILE *input);
    "
  `);
  expect(files[1].contents).toContain('{"output-format", 0, false, false, 1}');
  expect(files[1].contents).toContain('{"verbose", 118, true, false, 0}');
  expect(files[1].contents).toContain('"read"');
});
