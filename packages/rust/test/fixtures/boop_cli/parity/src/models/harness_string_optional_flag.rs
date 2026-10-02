use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct HarnessStringOptionalFlag {
  #[arg(long)]
  pub harness: Option<String>,
}
