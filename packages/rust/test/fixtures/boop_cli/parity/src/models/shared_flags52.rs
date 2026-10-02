use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags52 {
  #[doc = "Drop only the registry route; never kill the pane. The `--parent` on-exit epilogue uses this to clean up while still running inside it"]
  #[arg(long)]
  pub route_only: bool,
}
