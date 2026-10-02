use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct AsWhoTheRowsAreFlag {
  #[doc = "Who the rows are from, when the whoami ladder cannot say"]
  #[arg(long = "as")]
  pub name: Option<String>,
}
