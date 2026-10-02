use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags28 {
  #[doc = "Run the harness as this executable instead of its own binary (`ccz` is claude under the z.ai env). CLI wins over the preset's `bin`; the harness's own binary applies when neither names one"]
  #[arg(long)]
  pub bin: Option<String>,
}
