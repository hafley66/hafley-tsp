import { compile, NodeHost } from "@typespec/compiler";
import { expect, it } from "vitest";
import { emitSQL } from "@hafley/typespec-sql";
import { emitStore, cString } from "../src/emitter/4_store.js";

it("emits typed SQLite rows and the SQL package's exact DDL", async () => {
  const program = await compile(NodeHost, new URL("./fixtures/store/main.tsp", import.meta.url).pathname, { noEmit: true });
  expect(program.diagnostics).toEqual([]);
  const files = emitStore(program);
  expect(files[0].contents).toMatchInlineSnapshot(`
    "#pragma once
    #include <stdbool.h>
    #include <stddef.h>
    #include <stdint.h>
    #include <sqlite3.h>
    #include <mimalloc.h>

    extern const char Fixture_ddl[];
    typedef struct Fixture_entry_row {
      int64_t id;
      bool has_note;
      char * note;
      double score;
    } Fixture_entry_row;
    int Fixture_entry_insert(sqlite3 *db, const Fixture_entry_row *row);
    int Fixture_entry_select(sqlite3 *db, mi_heap_t *arena, Fixture_entry_row **rows, size_t *count);
    "
  `);
  expect(files[1].contents).toContain(`const char Fixture_ddl[] = ${cString(emitSQL(program))};`);
  expect(files[1].contents).toContain("sqlite3_bind_double(stmt, 3, row->score)");
  expect(files[1].contents).toContain("sqlite3_finalize(stmt)");
});
