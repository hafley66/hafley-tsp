use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct MailDirStringOptionalFlag {
  #[arg(long)]
  pub mail_dir: Option<String>,
}
