import "../../../packages/binding-core/lib/main.tsp";

using Entity;

/** Infrastructure: API call audit log. No external source model. */
model CallLog {
  @Entity.pk id: integer;
  endpoint: string;
  @Entity.default("'rest'")
  api_type: string;
  @Entity.default("'GET'")
  method: string;
  status_code: integer | null;
  etag: string | null;
  last_modified: string | null;
  rate_remaining: integer | null;
  rate_reset: integer | null;
  gql_cost: integer | null;
  @Entity.default("0")
  cache_hit: integer;
  duration_ms: integer | null;
  @Entity.default("(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
  called_at: string;

  @Entity.index(CallLog.endpoint, CallLog.called_at)
  _idx_endpoint: never;
}
