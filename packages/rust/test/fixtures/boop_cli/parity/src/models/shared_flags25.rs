use serde::Deserialize;
use serde::Serialize;

use crate::models::values0::Values0;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct SharedFlags25 {
  #[doc = "What this lane does when its parent route stops answering"]
  #[arg(long, value_enum, default_value = "orphan")]
  pub on_parent_death: Values0,
}
