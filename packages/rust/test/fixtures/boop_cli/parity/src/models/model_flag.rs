use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct ModelFlag {
  #[arg(long)]
  pub model: Option<String>,
}
