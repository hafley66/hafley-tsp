use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, clap::ValueEnum)]
pub enum Values0 {
  #[doc = "End the lane the way a stall kill does, reporting `parent-died`"]
  kill,
  #[doc = "Rewrite the parent edge onto the one registered coordinator, keep going"]
  reparent,
  #[doc = "Keep running with the dead edge, which is what every spawn did before the policy existed"]
  orphan,
}
