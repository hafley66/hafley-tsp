use serde::Deserialize;
use serde::Serialize;

use crate::models::values1::Values1;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct FormatFlag {
  #[arg(long, value_enum, default_value = "ndjson")]
  pub format: Values1,
}
