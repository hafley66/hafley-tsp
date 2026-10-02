use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct TimeoutFlag {
  #[doc = "Stop the job after this many seconds. The supervisor checks each poll"]
  #[arg(long)]
  pub timeout: Option<String>,
}
