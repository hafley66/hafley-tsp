import "../../../packages/binding-core/lib/main.tsp";
import "../source/gh_types.tsp";
import "./pull_request.tsp";

using Entity;
using Rel;
using Bind;

model PrReview {
  @Entity.pk id: integer;
  @Rel.belongsTo pr: PullRequest;
  @Entity.unique(PrReview.pr, PrReview.gh_id)
  gh_id: integer;
  `author.login`: string | null;
  state: string;
  body: string | null;
  submitted_at: string | null;
}

@Bind.from(GhReview, PrReview)
model PrReviewBinding {
  gh_id: [GhReview.id];
  submitted_at: [GhReview.submittedAt];
}
