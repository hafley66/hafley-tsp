use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags84 {
  #[arg(long, default_value_t = 50)]
  pub limit: u64,
}
