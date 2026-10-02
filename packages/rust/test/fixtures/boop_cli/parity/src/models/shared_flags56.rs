use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags56 {
  #[arg(long, default_value_t = 540)]
  pub timeout: u64,
}
