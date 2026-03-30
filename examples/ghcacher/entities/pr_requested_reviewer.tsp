import "../../../packages/binding-core/lib/main.tsp";
import "./pull_request.tsp";

using Entity;
using Rel;

/** Junction: PR <-> reviewer. Composite PK, no autoincrement. */
model PrRequestedReviewer {
  @Rel.belongsTo @Entity.pk pr: PullRequest;
  @Entity.pk reviewer: string;
}
