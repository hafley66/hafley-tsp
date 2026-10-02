use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct PrBaseFlag {
  #[doc = "The branch `gh pr create --base` targets; default `main`"]
  #[arg(long = "pr-base", value_name = "BRANCH")]
  pub pr_base_flag: Option<String>,
}
