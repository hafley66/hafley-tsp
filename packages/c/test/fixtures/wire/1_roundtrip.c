#include "wire_auto.h"
#include <assert.h>
#include <string.h>
int main(void) {
    mi_heap_t *source = mi_heap_new(), *destination = mi_heap_new();
    assert(source && destination);
    const char *json = "{\"text\":\"hello\\nworld\",\"state\":\"in-progress\",\"code\":9223372036854775807,\"labels\":[\"one\",\"two\"]}";
    Fixture_Message *value = Fixture_Message_json_decode(source, json, strlen(json));
    assert(value && value->state == Fixture_State_in_progress && value->code && *value->code == INT64_MAX);
    assert(value->labels.count == 2 && !strcmp(value->labels.items[1], "two"));
    Fixture_Message *owned = Fixture_Message_create(destination, value);
    assert(owned && owned->code != value->code && owned->labels.items != value->labels.items);
    char *encoded = Fixture_Message_json_encode(destination, owned);
    assert(encoded && strstr(encoded, "in-progress"));
    Fixture_Event *event = Fixture_Event_create_message(destination, owned);
    assert(event);
    char *event_json = Fixture_Event_json_encode(destination, event);
    assert(event_json);
    Fixture_Event *decoded = Fixture_Event_json_decode(destination, event_json, strlen(event_json));
    assert(decoded && decoded->tag == Fixture_Event_tag_message);
    mi_heap_destroy(source);
    assert(!strcmp(owned->labels.items[0], "one"));
    const char *bad = "{\"text\":\"x\",\"state\":\"done\",\"code\":18446744073709551615,\"labels\":[]}";
    assert(!Fixture_Message_json_decode(destination, bad, strlen(bad)));
    mi_heap_destroy(destination);
    return 0;
}
