use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct AsTheSubscriberDefaultsToFlag {
  #[doc = "The subscriber; defaults to the caller's identity"]
  #[arg(long = "as")]
  pub name: Option<String>,
}
