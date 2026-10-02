use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct WaitTimeoutFlag {
  #[doc = "Seconds `--wait` blocks before exiting 124; 0 waits forever"]
  #[arg(long, default_value_t = 3600)]
  pub wait_timeout: u64,
}
