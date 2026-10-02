use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags11 {
  #[doc = "Continue an existing trace instead of opening one named for the lane. Every session this lane runs joins it"]
  #[arg(long)]
  pub trace: Option<String>,
}
