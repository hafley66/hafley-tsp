use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct PresetFlag {
  #[doc = "The row of the config preset table this lane spawns from: harness, model, effort. The one model spelling `lane create` takes"]
  #[arg(long)]
  pub preset: Option<String>,
}
