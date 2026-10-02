use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags66 {
  #[doc = "Reasoning effort, threaded from the preset; the harness spells it as its own config, never as `model@effort`"]
  #[arg(long)]
  pub effort: Option<String>,
}
