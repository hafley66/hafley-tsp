#include "Fixture/cli_auto.h"
#include <assert.h>
#include <string.h>
static int read_entry(void *self, mi_heap_t *arena, const Fixture_root_args *root,
    const Fixture_read_entry_args *args, FILE *input) {
    (void)arena; (void)root; (void)input;
    assert(args->id == 42 && args->has_format && !strcmp(args->format, "json"));
    ++*(int *)self;
    return 0;
}
int main(void) {
    mi_heap_t *heap = mi_heap_new();
    assert(heap);
    Fixture_request request;
    char *argv[] = {"fixture", "entry", "read", "42", "--output-format=json"};
    assert(Fixture_cli_parse(heap, 5, argv, &request, NULL, NULL) == 0);
    int calls = 0;
    Fixture_ops ops = Fixture_ops_init(read_entry, NULL);
    assert(Fixture_cli_dispatch(&ops, &calls, heap, &request, NULL) == 0 && calls == 1);
    char *short_argv[] = {"fixture", "entry", "write", "-v"};
    assert(Fixture_cli_parse(heap, 4, short_argv, &request, NULL, NULL) == 0);
    assert(request.args.write_entry.verbose);
    char *bad[] = {"fixture", "entry", "read", "not-a-number"};
    assert(Fixture_cli_parse(heap, 4, bad, &request, NULL, NULL) == 2);
    char *undeclared[] = {"fixture", "entry", "read", "42", "-f", "json"};
    assert(Fixture_cli_parse(heap, 6, undeclared, &request, NULL, NULL) == 2);
    mi_heap_destroy(heap);
    return 0;
}
