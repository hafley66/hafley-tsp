use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags33 {
  #[doc = "tmux socket to spawn on; a throwaway socket for tests, `None` for the default server"]
  #[arg(long)]
  pub socket: Option<String>,
}
