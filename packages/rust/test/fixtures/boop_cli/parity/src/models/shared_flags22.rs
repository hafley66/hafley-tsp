use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags22 {
  #[doc = "Override a preset or global `post-pr` back off for this spawn"]
  #[arg(long)]
  pub no_post_pr: bool,
}
