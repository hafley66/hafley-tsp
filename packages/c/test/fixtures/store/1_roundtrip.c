#include "Fixture/store_auto.h"
#include <assert.h>
#include <string.h>
int main(void) {
    sqlite3 *db = NULL;
    assert(sqlite3_open(":memory:", &db) == SQLITE_OK);
    assert(sqlite3_exec(db, Fixture_ddl, NULL, NULL, NULL) == SQLITE_OK);
    Fixture_entry_row input = {.id = 1, .has_note = true, .note = "arena note", .score = 1.25};
    assert(Fixture_entry_insert(db, &input) == SQLITE_OK);
    assert(Fixture_entry_insert(db, &input) == SQLITE_CONSTRAINT);
    mi_heap_t *heap = mi_heap_new();
    assert(heap);
    Fixture_entry_row *rows = NULL;
    size_t count = 0;
    assert(Fixture_entry_select(db, heap, &rows, &count) == SQLITE_OK);
    assert(count == 1 && rows[0].id == 1 && rows[0].score == 1.25);
    assert(rows[0].has_note && !strcmp(rows[0].note, "arena note"));
    assert(sqlite3_close(db) == SQLITE_OK);
    assert(!strcmp(rows[0].note, "arena note"));
    mi_heap_destroy(heap);
    return 0;
}
