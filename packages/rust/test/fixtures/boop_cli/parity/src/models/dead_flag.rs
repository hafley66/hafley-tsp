use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct DeadFlag {
  #[doc = "The turnkey command after a tmux server death: print one table of dead coordinator routes, then ask which to revive"]
  #[arg(long)]
  pub dead: bool,
}
