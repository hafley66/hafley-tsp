use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags68 {
  #[doc = "opencode reasoning-effort variant, threaded from `lane create`"]
  #[arg(long)]
  pub variant: Option<String>,
}
