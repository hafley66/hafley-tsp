use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct VariantOpencodeReasoningEffortVariantFlag {
  #[doc = "opencode reasoning-effort variant, threaded from `lane create`"]
  #[arg(long)]
  pub variant: Option<String>,
}
