import "../../../packages/binding-core/lib/main.tsp";

using Entity;

/** Infrastructure: per-endpoint polling state. Text PK, no autoincrement. */
model PollState {
  @Entity.pk endpoint: string;
  etag: string | null;
  last_modified: string | null;
  poll_interval: integer | null;
  last_polled_at: string | null;
  last_changed_at: string | null;
}
