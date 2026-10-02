use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct HarnessStringRequiredFlag {
  #[arg(long)]
  pub harness: String,
}
