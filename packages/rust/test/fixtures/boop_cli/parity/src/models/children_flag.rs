use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct ChildrenFlag {
  #[arg(long)]
  pub children: bool,
}
