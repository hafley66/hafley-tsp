use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags54 {
  #[doc = "Print what a single-lane or bulk delete would remove, and remove nothing"]
  #[arg(long)]
  pub dry_run: bool,
}
