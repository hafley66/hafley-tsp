use serde::Deserialize;
use serde::Serialize;

use crate::models::values2::Values2;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct HookFlag {
  #[arg(long, value_enum, default_value = "plain")]
  pub hook: Values2,
}
