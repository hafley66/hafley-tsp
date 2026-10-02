use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags47 {
  #[arg(long)]
  pub cwd: Option<String>,
}
