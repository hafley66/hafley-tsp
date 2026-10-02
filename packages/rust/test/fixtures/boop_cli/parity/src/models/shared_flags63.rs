use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct SharedFlags63 {
  #[arg(long, value_name = "LANE")]
  pub lane: String,
}
