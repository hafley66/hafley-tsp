import "../../../packages/binding-core/lib/main.tsp";
import "./pull_request.tsp";

using Entity;
using Rel;
using Sync;

/** Junction: PR <-> reviewer. Composite PK, no autoincrement. */
@Sync.strategy("delete-replace")
model PrRequestedReviewer {
  @Rel.belongsTo @Entity.pk pr: PullRequest;
  @Entity.pk reviewer: string;
}
