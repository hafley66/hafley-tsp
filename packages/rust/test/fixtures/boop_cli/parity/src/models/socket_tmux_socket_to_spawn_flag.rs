use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SocketTmuxSocketToSpawnFlag {
  #[doc = "tmux socket to spawn on; a throwaway socket for tests, `None` for the default server"]
  #[arg(long)]
  pub socket: Option<String>,
}
