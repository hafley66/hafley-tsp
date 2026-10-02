use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags58 {
  #[arg(long = "as")]
  pub as_name: Option<String>,
}
