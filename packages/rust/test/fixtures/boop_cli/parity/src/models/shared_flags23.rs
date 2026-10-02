use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags23 {
  #[doc = "The branch `gh pr create --base` targets; default `main`"]
  #[arg(long)]
  pub pr_base_flag: Option<String>,
}
