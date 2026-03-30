import "../../../packages/binding-core/lib/main.tsp";

using Entity;

/** Infrastructure: append-only entity change log. No external source model. */
model ChangeLog {
  @Entity.pk id: integer;
  entity_type: string;
  entity_id: integer;
  event: string;
  repo_slug: string | null;
  payload_json: string | null;
  @Entity.default("(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
  occurred_at: string;

  @Entity.index(ChangeLog.entity_type, ChangeLog.occurred_at)
  _idx_entity_type: never;
}
