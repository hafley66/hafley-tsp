import "../../../packages/binding-core/lib/main.tsp";
import "../source/gh_types.tsp";
import "./repo.tsp";

using Entity;
using Rel;
using Bind;

model Branch {
  @Entity.pk id: integer;
  @Rel.belongsTo repo: Repo;
  @Entity.unique(Branch.repo, Branch.name)
  name: string;
  sha: string | null;
  behind_default: integer | null;
  ahead_default: integer | null;
  updated_at: string | null;
}

@Bind.from(GhBranch, Branch)
model BranchBinding {
  sha: [GhBranch.commit];
}
