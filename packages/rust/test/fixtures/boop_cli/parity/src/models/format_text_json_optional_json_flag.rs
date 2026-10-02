use serde::Deserialize;
use serde::Serialize;

use crate::models::values3::Values3;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct FormatTextJsonOptionalJsonFlag {
  #[arg(long, value_enum, default_value = "json")]
  pub format: Values3,
}
