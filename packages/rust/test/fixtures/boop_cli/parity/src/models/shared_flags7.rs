use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags7 {
  #[doc = "The lane's whole identity: `feature/<name>`, also fix/, refactor/, chore/. Lane id and tmux session are the branch with `/` as `-`"]
  #[arg(long)]
  pub branch: Option<String>,
}
