#include "wire_auto.h"
#include <assert.h>
#include <string.h>
int main(void) {
    mi_heap_t *source = mi_heap_new(), *destination = mi_heap_new();
    assert(source && destination);
    const char *json = "{\"text\":\"hello\\nworld\",\"state\":\"in-progress\",\"code\":9223372036854775807,\"labels\":[\"one\",\"two\"]}";
    Message *value = Message_json_decode(source, json, strlen(json));
    assert(value && value->state == State_in_progress && value->code && *value->code == INT64_MAX);
    assert(value->labels.count == 2 && !strcmp(value->labels.items[1], "two"));
    Message *owned = Message_create(destination, value);
    assert(owned && owned->code != value->code && owned->labels.items != value->labels.items);
    char *encoded = Message_json_encode(destination, owned);
    assert(encoded && strstr(encoded, "in-progress"));
    Event *event = Event_create_message(destination, owned);
    assert(event);
    char *event_json = Event_json_encode(destination, event);
    assert(event_json);
    Event *decoded = Event_json_decode(destination, event_json, strlen(event_json));
    assert(decoded && decoded->tag == Event_tag_message);
    mi_heap_destroy(source);
    assert(!strcmp(owned->labels.items[0], "one"));
    const char *bad = "{\"text\":\"x\",\"state\":\"done\",\"code\":18446744073709551615,\"labels\":[]}";
    assert(!Message_json_decode(destination, bad, strlen(bad)));
    mi_heap_destroy(destination);
    return 0;
}
