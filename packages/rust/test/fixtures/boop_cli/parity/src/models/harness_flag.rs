use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct HarnessFlag {
  #[doc = "Only lanes on this harness: claude, codex, opencode, kimi"]
  #[arg(long)]
  pub harness: Option<String>,
}
