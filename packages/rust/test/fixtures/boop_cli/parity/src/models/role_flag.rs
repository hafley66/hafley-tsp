use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct RoleFlag {
  #[arg(long)]
  pub role: Option<String>,
}
