import "../../../packages/binding-core/lib/main.tsp";
import "../source/gh_types.tsp";
import "./repo.tsp";

using Entity;
using Rel;
using Bind;

enum PrState { open; closed; merged }

model PullRequest {
  @Entity.pk id: integer;
  @Rel.belongsTo repo: Repo;
  @Entity.unique(PullRequest.repo, PullRequest.number)
  number: integer;
  gh_node_id: string | null;
  state: PrState;
  title: string;
  `author.login`: string | null;
  head_ref: string | null;
  head_sha: string | null;
  base_ref: string | null;
  mergeable: string | null;
  @Entity.default("0")
  is_draft: boolean;
  additions: integer | null;
  deletions: integer | null;
  changed_files: integer | null;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  body: string | null;
  @Entity.manual raw_json: string | null;

  @Entity.index(PullRequest.repo, PullRequest.state)
  _idx_repo_state: never;

  @Entity.index(PullRequest.updated_at)
  _idx_updated: never;
}

@Bind.from(GhPullRequest, PullRequest)
model PrBinding {
  gh_node_id:    [GhPullRequest.id];
  is_draft:      [GhPullRequest.isDraft];
  head_ref:      [GhPullRequest.headRefName];
  head_sha:      [GhPullRequest.headRefOid];
  base_ref:      [GhPullRequest.baseRefName];
  changed_files: [GhPullRequest.changedFiles];
  created_at:    [GhPullRequest.createdAt];
  updated_at:    [GhPullRequest.updatedAt];
  merged_at:     [GhPullRequest.mergedAt];
  closed_at:     [GhPullRequest.closedAt];
}
