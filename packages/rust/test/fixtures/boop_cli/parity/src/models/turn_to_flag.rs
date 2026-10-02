use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct TurnToFlag {
  #[arg(long)]
  pub turn_to: Option<String>,
}
