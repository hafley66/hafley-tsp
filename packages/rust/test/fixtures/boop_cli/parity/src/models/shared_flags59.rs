use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags59 {
  #[doc = "Print what would be pruned; remove nothing"]
  #[arg(long)]
  pub dry_run: bool,
}
