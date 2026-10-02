#include "Probe/Result_auto.h"
#include "Probe/Store_auto.h"
#include "Probe/Link_auto.h"
#ifdef BOOP_GATE
#include "Boop/Acp/channel/Delivery_auto.h"
#endif
#include <assert.h>
#include <string.h>

static Item *read_item(void *self, mi_heap_t *arena, Id id) {
  Item input = { .id = id, .label = self, .state = State_active };
  return Item_create(arena, &input);
}
static int64_t count_items(void *self, mi_heap_t *arena) {
  (void)self;
  (void)arena;
  return 1;
}
static void got_item(void *context, Item *value) { *(int *)context = (int)value->id; }
static void got_text(void *context, char *value) { *(int *)context = (int)strlen(value); }
static void got_count(void *context, int64_t value) { *(int *)context = (int)value; }
static void got_empty(void *context) { *(int *)context = -1; }

int main(void) {
  mi_heap_t *source = mi_heap_new();
  mi_heap_t *arena = mi_heap_new();
  assert(source && arena);
  for (int value = State_active; value <= State_inactive; ++value) {
    State *parsed_state = State_from_string(arena, State_to_string((State)value));
    assert(parsed_state && *parsed_state == (State)value);
    assert(mi_heap_contains(arena, parsed_state));
  }
  assert(!State_from_string(arena, "missing"));
  assert(!State_from_string(arena, NULL));
  assert(!State_from_string(NULL, "active"));
  assert(!State_to_string((State)123));
#ifdef BOOP_GATE
  for (int value = Delivery_MidTurn; value <= Delivery_NextTurn; ++value) {
    Delivery *parsed = Delivery_from_string(arena, Delivery_to_string((Delivery)value));
    assert(parsed && *parsed == (Delivery)value);
    assert(mi_heap_contains(arena, parsed));
  }
  assert(!Delivery_from_string(arena, "missing"));
  assert(!Delivery_from_string(NULL, "midturn"));
  assert(!Delivery_from_string(arena, NULL));
  assert(!Delivery_to_string((Delivery)123));
#endif

  Item input = { .id = 42, .label = mi_heap_strdup(source, "payload"), .state = State_active,
    .has_note = true, .note = mi_heap_strdup(source, "note") };
  Result *original = Result_create_item(source, &input);
  assert(original && original->value.item != &input);
  Result *parsed = Result_parse(arena, Result_tag_to_string(original->tag), &original->value);
  assert(parsed && parsed->tag == Result_tag_item);
  assert(parsed->value.item != original->value.item);
  assert(parsed->value.item->label != original->value.item->label);
  assert(mi_heap_contains(arena, parsed));
  assert(mi_heap_contains(arena, parsed->value.item));
  assert(mi_heap_contains(arena, parsed->value.item->label));
  mi_heap_destroy(source);
  assert(parsed->value.item->id == 42);
  assert(strcmp(parsed->value.item->label, "payload") == 0);
  assert(strcmp(parsed->value.item->note, "note") == 0);

  Result_cases cases = Result_cases_init(got_item, got_text, got_count, got_empty);
  int matched = 0;
  Result_match(parsed, &matched, &cases);
  assert(matched == 42);
  char text[] = "text";
  Result *text_value = Result_create_text(arena, text);
  Result *text_copy = Result_parse(arena, Result_tag_to_string(text_value->tag), &text_value->value);
  text[0] = 'X';
  assert(strcmp(text_copy->value.text, "text") == 0);
  Result_match(text_copy, &matched, &cases);
  assert(matched == 4);
  Result *number = Result_create_count(arena, -100);
  Result *number_copy = Result_parse(arena, Result_tag_to_string(number->tag), &number->value);
  assert(number_copy->value.count == -100);
  Result_match(number_copy, &matched, &cases);
  assert(matched == -100);
  Result *empty = Result_create_empty(arena);
  Result_match(empty, &matched, &cases);
  assert(matched == -1);
  assert(!Result_parse(arena, "unknown", &parsed->value));
  assert(!Result_parse(NULL, "item", &parsed->value));
  assert(!Result_parse(arena, NULL, &parsed->value));
  assert(!Result_parse(arena, "item", NULL));

  Store table = { .read = read_item, .count = count_items };
  Store store = Store_create(arena, &table);
  Item *item = store.read("vtable", arena, 9);
  assert(item && item->id == 9 && strcmp(item->label, "vtable") == 0);
  assert(store.count(NULL, arena) == 1);
  Link tail = { .value = 2 };
  Peer peer = {0};
  Link head = { .value = 1, .has_next = true, .next = &tail, .has_peer = true, .peer = &peer };
  Link *link = Link_create(arena, &head);
  assert(link && link->next != &tail && link->next->value == 2);
  assert(link->peer != &peer && !link->peer->has_link);
  assert(!link->next->has_next && !link->next->next);
  assert(!Link_create(NULL, &head) && !Link_create(arena, NULL));
  mi_heap_destroy(arena);
  return 0;
}
