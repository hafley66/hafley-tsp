use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags40 {
  #[doc = "Only routes active this recently: Ns, Nm, Nh"]
  #[arg(long, default_value = "1h")]
  pub since: String,
}
