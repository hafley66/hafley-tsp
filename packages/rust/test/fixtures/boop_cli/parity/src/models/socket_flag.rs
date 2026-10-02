use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SocketFlag {
  #[doc = "Read liveness from this tmux socket; the default server when unset. Pane ids repeat across sockets, so a throwaway socket needs it"]
  #[arg(long)]
  pub socket: Option<String>,
}
