import "../../../packages/binding-core/lib/main.tsp";
import "../source/gh_types.tsp";
import "./pull_request.tsp";

using Entity;
using Rel;
using Bind;

model PrStatusCheck {
  @Entity.pk id: integer;
  @Rel.belongsTo pr: PullRequest;
  @Entity.unique(PrStatusCheck.pr, PrStatusCheck.context)
  context: string;
  state: string;
  target_url: string | null;
  description: string | null;
  updated_at: string | null;
}

@Bind.from(GhStatusCheck, PrStatusCheck)
model PrStatusCheckBinding {
  target_url: [GhStatusCheck.target_url];
}
