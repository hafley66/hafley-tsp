use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct CwdStringOptionalFlag {
  #[arg(long)]
  pub cwd: Option<String>,
}
