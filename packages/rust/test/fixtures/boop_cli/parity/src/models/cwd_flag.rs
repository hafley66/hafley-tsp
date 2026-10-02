use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct CwdFlag {
  #[doc = "Repo to branch from. Without it the brief's own repo wins, and only a brief outside any repo falls back to the caller's cwd"]
  #[arg(long)]
  pub cwd: Option<String>,
}
