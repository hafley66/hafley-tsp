use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct MailDirFlag {
  #[doc = "Directory holding boop.db; defaults to ~/.agent"]
  #[arg(long)]
  pub mail_dir: Option<String>,
}
