use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags42 {
  #[arg(long)]
  pub mail_dir: Option<String>,
}
