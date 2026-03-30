import "../../../packages/binding-core/lib/main.tsp";
import "../source/gh_types.tsp";
import "./pull_request.tsp";

using Entity;
using Rel;
using Bind;

model PrComment {
  @Entity.pk id: integer;
  @Rel.belongsTo pr: PullRequest;
  @Entity.unique(PrComment.pr, PrComment.gh_id)
  gh_id: integer;
  `author.login`: string | null;
  body: string;
  path: string | null;
  line: integer | null;
  in_reply_to_id: integer | null;
  created_at: string;
  updated_at: string;
}

@Bind.from(GhPrComment, PrComment)
model PrCommentBinding {
  gh_id: [GhPrComment.id];
  in_reply_to_id: [GhPrComment.in_reply_to_id];
}
