use serde::Deserialize;
use serde::Serialize;

use crate::models::values2::Values2;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args)]
pub struct SharedFlags71 {
  #[doc = "Possible values:\n- stop:   Claude Code's `Stop`: the mail comes back as a block decision\n- prompt: Claude Code's `UserPromptSubmit`: the mail is printed as context\n- plain:  A human or a script reading the inbox"]
  #[arg(long, value_enum, default_value = "plain")]
  pub hook: Values2,
}
