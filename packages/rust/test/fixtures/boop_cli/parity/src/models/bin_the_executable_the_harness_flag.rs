use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct BinTheExecutableTheHarnessFlag {
  #[doc = "The executable the harness runs as, threaded from `lane create`"]
  #[arg(long)]
  pub bin: Option<String>,
}
