use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags27 {
  #[doc = "opencode reasoning-effort variant (low|medium|high); CLI wins over the preset's variant, and opencode's default applies when neither"]
  #[arg(long)]
  pub variant: Option<String>,
}
