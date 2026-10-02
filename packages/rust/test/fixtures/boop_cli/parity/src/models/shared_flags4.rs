use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags4 {
  #[doc = "Omit the header line; for scripts"]
  #[arg(long)]
  pub no_header: bool,
}
