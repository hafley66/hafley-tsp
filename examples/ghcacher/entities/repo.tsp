import "../../../packages/binding-core/lib/main.tsp";
import "../source/gh_types.tsp";

using Entity;
using Rel;
using Bind;

model Repo {
  @Entity.pk id: integer;
  @Entity.unique(Repo.owner, Repo.name)
  owner: string;
  name: string;
  default_branch: string;
  gh_node_id: string | null;
  updated_at: string | null;
}

@Bind.from(GhRepo, Repo)
model RepoBinding {
  owner: [GhRepo.owner, GhUser.login];
  default_branch: [GhRepo.defaultBranchRef, GhRef.name];
}
