import "../../../packages/binding-core/lib/main.tsp";
import "./repo.tsp";

using Entity;
using Rel;

/** Local checkout tracking -- no external source model. */
model Checkout {
  @Entity.pk id: integer;
  @Rel.belongsTo repo: Repo;
  @Entity.unique(Checkout.repo, Checkout.branch)
  branch: string;
  local_path: string;
  sha: string | null;
  checked_out_at: string;
}
