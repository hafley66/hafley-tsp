use serde::Deserialize;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct Inputs {
  #[doc = "Keep files matching GLOB under each directory input; repeatable"]
  #[arg(long)]
  pub pattern: Option<Vec<String>>,
  #[doc = "Run on the files FILE reaches over imports (universe: the PATH inputs, else FILE's project)"]
  #[arg(long)]
  pub entry: Option<Vec<PathBuf>>,
  #[doc = "Import hops from --entry"]
  #[arg(long)]
  pub depth: Option<u32>,
  #[doc = "Corpus root"]
  #[arg(long)]
  pub root: Option<PathBuf>,
}
