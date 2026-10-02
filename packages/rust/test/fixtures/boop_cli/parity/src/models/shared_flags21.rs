use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags21 {
  #[doc = "Finish by opening a PR: the lane brief closes with the push-and-PR line. Overrides a preset or global `post-pr`"]
  #[arg(long)]
  pub post_pr: bool,
}
