use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags19 {
  #[doc = "An env var the lane's spawn inherits, `KEY=VAL`. Repeatable; each value is shell-quoted onto the supervisor's spawn command"]
  #[arg(long)]
  pub key_val: Option<Vec<String>>,
}
