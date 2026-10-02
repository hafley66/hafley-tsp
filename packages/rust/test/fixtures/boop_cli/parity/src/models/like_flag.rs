use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct LikeFlag {
  #[doc = "Prefix match on the row's leading dictionary column"]
  #[arg(long)]
  pub like: Option<String>,
}
