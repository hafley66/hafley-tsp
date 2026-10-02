use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct LaneTheForkedLaneWhenFlag {
  #[doc = "The forked lane, when one comment forked off several"]
  #[arg(long, value_name = "LANE")]
  pub lane: Option<String>,
}
