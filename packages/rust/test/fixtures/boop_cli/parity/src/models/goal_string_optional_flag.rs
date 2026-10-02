use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct GoalStringOptionalFlag {
  #[arg(long)]
  pub goal: Option<String>,
}
