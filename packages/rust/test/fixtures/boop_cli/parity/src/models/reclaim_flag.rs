use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct ReclaimFlag {
  #[doc = "Folded (dead-lane-self-reset): a dead name is reset on every create, so this is a no-op alias kept for old scripts"]
  #[arg(long)]
  pub reclaim: bool,
}
