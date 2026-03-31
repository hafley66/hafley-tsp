// alloy-imports-start
use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::SqliteConnection;
use clap::{Parser, Subcommand};


// alloy-imports-end
// alloy-row-structs-start


// alloy-row-structs-end
// alloy-extraction-structs-start


// alloy-extraction-structs-end
// alloy-upsert-fns-start


// alloy-upsert-fns-end
// alloy-extract-fns-start


// alloy-extract-fns-end
// alloy-config-start
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
  #[serde(skip_serializing)]
  pub github_token: String,
  pub org: String,
  #[serde(default = "default_app_settings_db_path")]
  pub db_path: String,
  #[serde(default = "default_app_settings_poll_interval")]
  pub poll_interval: i64,
  #[serde(default = "default_app_settings_sync_notifications")]
  pub sync_notifications: bool,
  #[serde(default = "default_app_settings_max_concurrency")]
  pub max_concurrency: i64,
}
fn default_app_settings_db_path() -> String { "ghcacher.db".to_owned() }
fn default_app_settings_poll_interval() -> i64 { 60 }
fn default_app_settings_sync_notifications() -> bool { true }
fn default_app_settings_max_concurrency() -> i64 { 5 }

impl AppSettings {
    pub fn load() -> Result<Self> {
        let path = shellexpand::tilde("~/.config/ghcacher/config.toml").to_string();
        let contents = std::fs::read_to_string(&path)?;
        let config: Self = toml::from_str(&contents)?;
        Ok(config)
    }
}
// alloy-config-end
// alloy-cli-start

#[derive(Debug, Clone, Parser)]
#[command(about = "GitHub organization cacher")]
pub struct AppSettingsCli {

      #[arg(long, env = "GITHUB_TOKEN", help = "GitHub personal access token")]
      pub github_token: String,
      #[arg(long, short = 'o', env = "GHCACHER_ORG", help = "GitHub organization to cache")]
      pub org: String,
      #[arg(long, env = "GHCACHER_DB", default_value = "ghcacher.db", help = "SQLite database path")]
      pub db_path: String,
      #[arg(long, short = 'i', default_value = "60", help = "Poll interval in seconds")]
      pub poll_interval: i64,
      #[arg(long, default_value = "true", help = "Enable notification sync")]
      pub sync_notifications: bool,
      #[arg(long, default_value = "5", help = "Max concurrent API requests")]
      pub max_concurrency: i64,
}
// alloy-cli-end
// alloy-config-cli-merge-start
impl AppSettings {
    /// Apply CLI overrides. CLI values take precedence over config file.
    pub fn with_cli(mut self, cli: &AppSettingsCli) -> Self {
        self.github_token = cli.github_token.clone();
        self.org = cli.org.clone();
        self.db_path = cli.db_path.clone();
        self.poll_interval = cli.poll_interval;
        self.sync_notifications = cli.sync_notifications;
        self.max_concurrency = cli.max_concurrency;
        self
    }

    /// Apply environment variable overrides.
    pub fn with_env(mut self) -> Self {
        if let Ok(val) = std::env::var("GITHUB_TOKEN") {
            self.github_token = val;
        }
        if let Ok(val) = std::env::var("GHCACHER_ORG") {
            self.org = val;
        }
        if let Ok(val) = std::env::var("GHCACHER_DB") {
            self.db_path = val;
        }
        self
    }
}
// alloy-config-cli-merge-end

// Custom code below this line is preserved across re-generation.
