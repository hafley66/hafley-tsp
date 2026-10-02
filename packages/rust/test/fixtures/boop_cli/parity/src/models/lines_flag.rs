use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct LinesFlag {
  #[arg(long)]
  pub lines: Option<String>,
}
