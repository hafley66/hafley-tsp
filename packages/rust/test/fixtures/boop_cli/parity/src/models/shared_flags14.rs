use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags14 {
  #[doc = "Defaults to origin/main's head, resolved and printed at spawn"]
  #[arg(long)]
  pub base_sha: Option<String>,
}
