use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct ParentTheLaneThatSummonedFlag {
  #[doc = "The lane that summoned this one"]
  #[arg(long)]
  pub parent: Option<String>,
}
