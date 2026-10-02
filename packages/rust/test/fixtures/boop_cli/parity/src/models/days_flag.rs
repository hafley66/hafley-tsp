use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct DaysFlag {
  #[doc = "Look back this many days"]
  #[arg(long, default_value_t = 7)]
  pub days: u64,
}
