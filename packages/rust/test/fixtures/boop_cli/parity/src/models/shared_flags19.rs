use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags19 {
  #[doc = "An env var the lane's spawn inherits, `KEY=VAL`. Repeatable; each value is shell-quoted onto the supervisor's spawn command"]
  #[arg(long, value_name = "KEY=VAL", value_parser = |s: &str| -> Result<(String, String), String> { s.split_once('=').filter(|(key, _)| !key.is_empty()).map(|(key, value)| (key.to_owned(), value.to_owned())).ok_or_else(|| "expected KEY=VAL with a nonempty key".to_owned()) })]
  pub env: Vec<(String, String)>,
}
