use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct BriefAbsolutePathToTheFlag {
  #[doc = "Absolute path to the brief that opens the conversation"]
  #[arg(long)]
  pub brief: String,
}
