import "../../../packages/binding-core/lib/main.tsp";
import "./pull_request.tsp";

using Entity;
using Rel;

/** Junction: PR <-> label. Composite PK, no autoincrement. */
model PrLabel {
  @Rel.belongsTo @Entity.pk pr: PullRequest;
  @Entity.pk label: string;
  color: string | null;
}
