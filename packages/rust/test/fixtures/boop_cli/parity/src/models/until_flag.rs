use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct UntilFlag {
  #[arg(long)]
  pub until: Option<String>,
}
