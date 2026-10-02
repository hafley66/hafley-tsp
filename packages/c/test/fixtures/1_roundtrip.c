#include "Probe/Result_auto.h"
#include "Probe/Store_auto.h"
#include "Probe/Link_auto.h"
#ifdef BOOP_GATE
#include "Boop/Acp/channel/Delivery_auto.h"
#endif
#include <assert.h>
#include <string.h>

static Probe_Item *read_item(void *self, mi_heap_t *arena, Probe_Id id) {
  Probe_Item input = { .id = id, .label = self, .state = Probe_State_active };
  return Probe_Item_create(arena, &input);
}
static int64_t count_items(void *self, mi_heap_t *arena) {
  (void)self;
  (void)arena;
  return 1;
}
static void got_item(void *context, Probe_Item *value) { *(int *)context = (int)value->id; }
static void got_text(void *context, char *value) { *(int *)context = (int)strlen(value); }
static void got_count(void *context, int64_t value) { *(int *)context = (int)value; }
static void got_empty(void *context) { *(int *)context = -1; }

int main(void) {
  mi_heap_t *source = mi_heap_new();
  mi_heap_t *arena = mi_heap_new();
  assert(source && arena);
  for (int value = Probe_State_active; value <= Probe_State_inactive; ++value) {
    Probe_State *parsed_state = Probe_State_from_string(arena, Probe_State_to_string((Probe_State)value));
    assert(parsed_state && *parsed_state == (Probe_State)value);
    assert(mi_heap_contains(arena, parsed_state));
  }
  assert(!Probe_State_from_string(arena, "missing"));
  assert(!Probe_State_from_string(arena, NULL));
  assert(!Probe_State_from_string(NULL, "active"));
  assert(!Probe_State_to_string((Probe_State)123));
#ifdef BOOP_GATE
  for (int value = Boop_Acp_channel_Delivery_MidTurn; value <= Boop_Acp_channel_Delivery_NextTurn; ++value) {
    Boop_Acp_channel_Delivery *parsed = Boop_Acp_channel_Delivery_from_string(arena, Boop_Acp_channel_Delivery_to_string((Boop_Acp_channel_Delivery)value));
    assert(parsed && *parsed == (Boop_Acp_channel_Delivery)value);
    assert(mi_heap_contains(arena, parsed));
  }
  assert(!Boop_Acp_channel_Delivery_from_string(arena, "missing"));
  assert(!Boop_Acp_channel_Delivery_from_string(NULL, "midturn"));
  assert(!Boop_Acp_channel_Delivery_from_string(arena, NULL));
  assert(!Boop_Acp_channel_Delivery_to_string((Boop_Acp_channel_Delivery)123));
#endif

  Probe_Item input = { .id = 42, .label = mi_heap_strdup(source, "payload"), .state = Probe_State_active,
    .has_note = true, .note = mi_heap_strdup(source, "note") };
  Probe_Result *original = Probe_Result_create_item(source, &input);
  assert(original && original->value.item != &input);
  Probe_Result *parsed = Probe_Result_parse(arena, Probe_Result_tag_to_string(original->tag), &original->value);
  assert(parsed && parsed->tag == Probe_Result_tag_item);
  assert(parsed->value.item != original->value.item);
  assert(parsed->value.item->label != original->value.item->label);
  assert(mi_heap_contains(arena, parsed));
  assert(mi_heap_contains(arena, parsed->value.item));
  assert(mi_heap_contains(arena, parsed->value.item->label));
  mi_heap_destroy(source);
  assert(parsed->value.item->id == 42);
  assert(strcmp(parsed->value.item->label, "payload") == 0);
  assert(strcmp(parsed->value.item->note, "note") == 0);

  Probe_Result_cases cases = Probe_Result_cases_init(got_item, got_text, got_count, got_empty);
  int matched = 0;
  Probe_Result_match(parsed, &matched, &cases);
  assert(matched == 42);
  char text[] = "text";
  Probe_Result *text_value = Probe_Result_create_text(arena, text);
  Probe_Result *text_copy = Probe_Result_parse(arena, Probe_Result_tag_to_string(text_value->tag), &text_value->value);
  text[0] = 'X';
  assert(strcmp(text_copy->value.text, "text") == 0);
  Probe_Result_match(text_copy, &matched, &cases);
  assert(matched == 4);
  Probe_Result *number = Probe_Result_create_count(arena, -100);
  Probe_Result *number_copy = Probe_Result_parse(arena, Probe_Result_tag_to_string(number->tag), &number->value);
  assert(number_copy->value.count == -100);
  Probe_Result_match(number_copy, &matched, &cases);
  assert(matched == -100);
  Probe_Result *empty = Probe_Result_create_empty(arena);
  Probe_Result_match(empty, &matched, &cases);
  assert(matched == -1);
  assert(!Probe_Result_parse(arena, "unknown", &parsed->value));
  assert(!Probe_Result_parse(NULL, "item", &parsed->value));
  assert(!Probe_Result_parse(arena, NULL, &parsed->value));
  assert(!Probe_Result_parse(arena, "item", NULL));

  Probe_Store table = { .read = read_item, .count = count_items };
  Probe_Store store = Probe_Store_create(arena, &table);
  Probe_Item *item = store.read("vtable", arena, 9);
  assert(item && item->id == 9 && strcmp(item->label, "vtable") == 0);
  assert(store.count(NULL, arena) == 1);
  Probe_Link tail = { .value = 2 };
  Probe_Peer peer = {0};
  Probe_Link head = { .value = 1, .has_next = true, .next = &tail, .has_peer = true, .peer = &peer };
  Probe_Link *link = Probe_Link_create(arena, &head);
  assert(link && link->next != &tail && link->next->value == 2);
  assert(link->peer != &peer && !link->peer->has_link);
  assert(!link->next->has_next && !link->next->next);
  assert(!Probe_Link_create(NULL, &head) && !Probe_Link_create(arena, NULL));
  mi_heap_destroy(arena);
  return 0;
}
