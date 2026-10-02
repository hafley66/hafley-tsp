use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, clap::ValueEnum)]
pub enum Values2 {
  #[doc = "Claude Code's `Stop`: the mail comes back as a block decision"]
  stop,
  #[doc = "Claude Code's `UserPromptSubmit`: the mail is printed as context"]
  prompt,
  #[doc = "A human or a script reading the inbox"]
  plain,
}
