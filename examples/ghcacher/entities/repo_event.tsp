import "../../../packages/binding-core/lib/main.tsp";
import "../source/gh_types.tsp";
import "./repo.tsp";

using Entity;
using Rel;
using Bind;

model RepoEvent {
  @Entity.pk id: integer;
  @Rel.belongsTo repo: Repo;
  @Entity.unique(RepoEvent.repo, RepoEvent.gh_id)
  gh_id: string;
  type: string;
  `actor.login`: string | null;
  payload_json: string;
  created_at: string;

  @Entity.index(RepoEvent.repo, RepoEvent.type)
  _idx_repo_type: never;

  @Entity.index(RepoEvent.created_at)
  _idx_created: never;
}

@Bind.from(GhRepoEvent, RepoEvent)
model RepoEventBinding {
  gh_id: [GhRepoEvent.id];
  payload_json: [GhRepoEvent.payload];
  created_at: [GhRepoEvent.created_at];
}
