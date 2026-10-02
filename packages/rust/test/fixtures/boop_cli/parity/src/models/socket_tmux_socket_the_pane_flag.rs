use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SocketTmuxSocketThePaneFlag {
  #[doc = "tmux socket the pane lives on; the default server when unset"]
  #[arg(long)]
  pub socket: Option<String>,
}
