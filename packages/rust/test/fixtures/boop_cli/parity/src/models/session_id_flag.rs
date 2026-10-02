use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SessionIdFlag {
  #[arg(long)]
  pub session_id: Option<String>,
}
