use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags43 {
  #[doc = "Also print what the lane changed in its tree: commits past its base sha, uncommitted files, and the paths those commits touched"]
  #[arg(long)]
  pub touched: bool,
}
