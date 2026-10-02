use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct LaneFlag {
  #[doc = "Overrides the lane id derived from `--branch`"]
  #[arg(long, value_name = "LANE")]
  pub lane: Option<String>,
}
