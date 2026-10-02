use serde::Deserialize;
use serde::Serialize;

use crate::models::values3::Values3;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct SharedFlags91 {
  #[arg(long, value_enum, default_value = "text")]
  pub format: Values3,
}
