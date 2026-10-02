use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct JsonPrintOneJSONResultFlag {
  #[doc = "Print one JSON result object"]
  #[arg(long)]
  pub json: bool,
}
