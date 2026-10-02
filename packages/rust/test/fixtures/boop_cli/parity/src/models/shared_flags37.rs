use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags37 {
  #[doc = "Print that table and exit; the read path, no prompt, no spawn"]
  #[arg(long)]
  pub list: bool,
}
