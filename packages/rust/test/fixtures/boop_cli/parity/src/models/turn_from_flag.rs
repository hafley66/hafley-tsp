use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct TurnFromFlag {
  #[arg(long)]
  pub turn_from: Option<String>,
}
