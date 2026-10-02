use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags83 {
  #[doc = "Only this harness: claude, codex, kimi, opencode"]
  #[arg(long)]
  pub harness: Option<String>,
}
