use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct LaneLaneNameRequiredFlag {
  #[arg(long, value_name = "LANE")]
  pub lane: String,
}
