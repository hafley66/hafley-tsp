use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags38 {
  #[doc = "`--list` as JSON, uncut, for a reader that draws its own table"]
  #[arg(long)]
  pub json: bool,
}
