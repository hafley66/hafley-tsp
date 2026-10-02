use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags0 {
  #[doc = "Only lanes in this state: `live`, `idle`, `retired` or `dead`. `retired` lanes have left their pane on the idle shutdown and come back on `boop beep <lane> <body>`"]
  #[arg(long)]
  pub state: Option<String>,
}
