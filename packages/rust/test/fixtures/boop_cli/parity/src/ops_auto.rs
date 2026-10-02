use crate::models::shared_flags0::SharedFlags0;
use crate::models::shared_flags10::SharedFlags10;
use crate::models::shared_flags11::SharedFlags11;
use crate::models::shared_flags12::SharedFlags12;
use crate::models::shared_flags13::SharedFlags13;
use crate::models::shared_flags14::SharedFlags14;
use crate::models::shared_flags15::SharedFlags15;
use crate::models::shared_flags16::SharedFlags16;
use crate::models::shared_flags17::SharedFlags17;
use crate::models::shared_flags18::SharedFlags18;
use crate::models::shared_flags19::SharedFlags19;
use crate::models::shared_flags1::SharedFlags1;
use crate::models::shared_flags20::SharedFlags20;
use crate::models::shared_flags21::SharedFlags21;
use crate::models::shared_flags22::SharedFlags22;
use crate::models::shared_flags23::SharedFlags23;
use crate::models::shared_flags24::SharedFlags24;
use crate::models::shared_flags25::SharedFlags25;
use crate::models::shared_flags26::SharedFlags26;
use crate::models::shared_flags27::SharedFlags27;
use crate::models::shared_flags28::SharedFlags28;
use crate::models::shared_flags29::SharedFlags29;
use crate::models::shared_flags2::SharedFlags2;
use crate::models::shared_flags30::SharedFlags30;
use crate::models::shared_flags31::SharedFlags31;
use crate::models::shared_flags32::SharedFlags32;
use crate::models::shared_flags33::SharedFlags33;
use crate::models::shared_flags34::SharedFlags34;
use crate::models::shared_flags35::SharedFlags35;
use crate::models::shared_flags36::SharedFlags36;
use crate::models::shared_flags37::SharedFlags37;
use crate::models::shared_flags38::SharedFlags38;
use crate::models::shared_flags39::SharedFlags39;
use crate::models::shared_flags3::SharedFlags3;
use crate::models::shared_flags40::SharedFlags40;
use crate::models::shared_flags41::SharedFlags41;
use crate::models::shared_flags42::SharedFlags42;
use crate::models::shared_flags43::SharedFlags43;
use crate::models::shared_flags44::SharedFlags44;
use crate::models::shared_flags45::SharedFlags45;
use crate::models::shared_flags46::SharedFlags46;
use crate::models::shared_flags47::SharedFlags47;
use crate::models::shared_flags48::SharedFlags48;
use crate::models::shared_flags49::SharedFlags49;
use crate::models::shared_flags4::SharedFlags4;
use crate::models::shared_flags50::SharedFlags50;
use crate::models::shared_flags51::SharedFlags51;
use crate::models::shared_flags52::SharedFlags52;
use crate::models::shared_flags53::SharedFlags53;
use crate::models::shared_flags54::SharedFlags54;
use crate::models::shared_flags55::SharedFlags55;
use crate::models::shared_flags56::SharedFlags56;
use crate::models::shared_flags57::SharedFlags57;
use crate::models::shared_flags58::SharedFlags58;
use crate::models::shared_flags59::SharedFlags59;
use crate::models::shared_flags5::SharedFlags5;
use crate::models::shared_flags60::SharedFlags60;
use crate::models::shared_flags61::SharedFlags61;
use crate::models::shared_flags62::SharedFlags62;
use crate::models::shared_flags63::SharedFlags63;
use crate::models::shared_flags64::SharedFlags64;
use crate::models::shared_flags65::SharedFlags65;
use crate::models::shared_flags66::SharedFlags66;
use crate::models::shared_flags67::SharedFlags67;
use crate::models::shared_flags68::SharedFlags68;
use crate::models::shared_flags69::SharedFlags69;
use crate::models::shared_flags6::SharedFlags6;
use crate::models::shared_flags70::SharedFlags70;
use crate::models::shared_flags71::SharedFlags71;
use crate::models::shared_flags72::SharedFlags72;
use crate::models::shared_flags73::SharedFlags73;
use crate::models::shared_flags74::SharedFlags74;
use crate::models::shared_flags75::SharedFlags75;
use crate::models::shared_flags76::SharedFlags76;
use crate::models::shared_flags77::SharedFlags77;
use crate::models::shared_flags78::SharedFlags78;
use crate::models::shared_flags79::SharedFlags79;
use crate::models::shared_flags7::SharedFlags7;
use crate::models::shared_flags80::SharedFlags80;
use crate::models::shared_flags81::SharedFlags81;
use crate::models::shared_flags82::SharedFlags82;
use crate::models::shared_flags83::SharedFlags83;
use crate::models::shared_flags84::SharedFlags84;
use crate::models::shared_flags85::SharedFlags85;
use crate::models::shared_flags86::SharedFlags86;
use crate::models::shared_flags87::SharedFlags87;
use crate::models::shared_flags88::SharedFlags88;
use crate::models::shared_flags89::SharedFlags89;
use crate::models::shared_flags8::SharedFlags8;
use crate::models::shared_flags90::SharedFlags90;
use crate::models::shared_flags91::SharedFlags91;
use crate::models::shared_flags9::SharedFlags9;
use crate::models::values0::Values0;
use crate::models::values1::Values1;
use crate::models::values4::Values4;
use crate::models::values5::Values5;
use crate::models::values6::Values6;
use crate::models::values7::Values7;
use crate::models::values8::Values8;

#[derive(Debug)]
pub struct OpError(pub String);

impl<E: std::error::Error> From<E> for OpError {
    fn from(e: E) -> Self {
        OpError(e.to_string())
    }
}

impl std::fmt::Display for OpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

pub type OpResult<T> = Result<T, OpError>;

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct RootArgs {
  #[doc = "Run a persistent foreground ACP coordinator. Agent names such as `codex` work directly; model preset names resolve through config"]
  #[arg(long)]
  pub preset: Option<String>,
  #[doc = "Registry and ACPX session name for the foreground coordinator"]
  #[arg(long)]
  pub name: Option<String>,
  #[doc = "Mail registry for the foreground coordinator"]
  #[arg(long)]
  pub mail_dir: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct JobArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobListArgs {
  #[command(flatten)]
  pub sharedFlags0: SharedFlags0,
  #[command(flatten)]
  pub sharedFlags1: SharedFlags1,
  #[command(flatten)]
  pub sharedFlags2: SharedFlags2,
  #[command(flatten)]
  pub sharedFlags3: SharedFlags3,
  #[command(flatten)]
  pub sharedFlags4: SharedFlags4,
  #[command(flatten)]
  pub sharedFlags5: SharedFlags5,
  #[command(flatten)]
  pub sharedFlags6: SharedFlags6,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobResumeArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags6: SharedFlags6,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobCreateArgs {
  #[command(flatten)]
  pub sharedFlags7: SharedFlags7,
  #[command(flatten)]
  pub sharedFlags8: SharedFlags8,
  #[command(flatten)]
  pub sharedFlags9: SharedFlags9,
  #[command(flatten)]
  pub sharedFlags10: SharedFlags10,
  #[command(flatten)]
  pub sharedFlags11: SharedFlags11,
  #[command(flatten)]
  pub sharedFlags12: SharedFlags12,
  #[command(flatten)]
  pub sharedFlags13: SharedFlags13,
  #[command(flatten)]
  pub sharedFlags14: SharedFlags14,
  #[command(flatten)]
  pub sharedFlags15: SharedFlags15,
  #[command(flatten)]
  pub sharedFlags16: SharedFlags16,
  #[command(flatten)]
  pub sharedFlags17: SharedFlags17,
  #[command(flatten)]
  pub sharedFlags18: SharedFlags18,
  #[command(flatten)]
  pub sharedFlags19: SharedFlags19,
  #[command(flatten)]
  pub sharedFlags20: SharedFlags20,
  #[command(flatten)]
  pub sharedFlags21: SharedFlags21,
  #[command(flatten)]
  pub sharedFlags22: SharedFlags22,
  #[command(flatten)]
  pub sharedFlags23: SharedFlags23,
  #[command(flatten)]
  pub sharedFlags24: SharedFlags24,
  #[command(flatten)]
  pub sharedFlags25: SharedFlags25,
  #[command(flatten)]
  pub sharedFlags26: SharedFlags26,
  #[command(flatten)]
  pub sharedFlags27: SharedFlags27,
  #[command(flatten)]
  pub sharedFlags28: SharedFlags28,
  #[command(flatten)]
  pub sharedFlags29: SharedFlags29,
  #[command(flatten)]
  pub sharedFlags30: SharedFlags30,
  #[command(flatten)]
  pub sharedFlags31: SharedFlags31,
  #[command(flatten)]
  pub sharedFlags32: SharedFlags32,
  #[command(flatten)]
  pub sharedFlags33: SharedFlags33,
  #[command(flatten)]
  pub sharedFlags6: SharedFlags6,
  #[command(flatten)]
  pub sharedFlags34: SharedFlags34,
  #[command(flatten)]
  pub sharedFlags35: SharedFlags35,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobReviveArgs {
  #[doc = "The dead route to revive. Omit for `--dead` or `--list`"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[command(flatten)]
  pub sharedFlags36: SharedFlags36,
  #[command(flatten)]
  pub sharedFlags37: SharedFlags37,
  #[command(flatten)]
  pub sharedFlags38: SharedFlags38,
  #[command(flatten)]
  pub sharedFlags39: SharedFlags39,
  #[command(flatten)]
  pub sharedFlags40: SharedFlags40,
  #[command(flatten)]
  pub sharedFlags41: SharedFlags41,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobGetArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags43: SharedFlags43,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobWhereArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobPatchArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags44: SharedFlags44,
  #[command(flatten)]
  pub sharedFlags45: SharedFlags45,
  #[command(flatten)]
  pub sharedFlags46: SharedFlags46,
  #[command(flatten)]
  pub sharedFlags47: SharedFlags47,
  #[command(flatten)]
  pub sharedFlags48: SharedFlags48,
  #[command(flatten)]
  pub sharedFlags49: SharedFlags49,
  #[command(flatten)]
  pub sharedFlags50: SharedFlags50,
  #[command(flatten)]
  pub sharedFlags51: SharedFlags51,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobDeleteArgs {
  #[doc = "One lane: kill its pane and drop its route. Omit for a bulk delete by `--state`"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[command(flatten)]
  pub sharedFlags52: SharedFlags52,
  #[command(flatten)]
  pub sharedFlags53: SharedFlags53,
  #[command(flatten)]
  pub sharedFlags54: SharedFlags54,
  #[command(flatten)]
  pub sharedFlags55: SharedFlags55,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobRmArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobKillArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobWaitArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags56: SharedFlags56,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobAttachArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobSignalArgs {
  #[arg()]
  pub signal: String,
  #[command(flatten)]
  pub sharedFlags57: SharedFlags57,
  #[command(flatten)]
  pub sharedFlags58: SharedFlags58,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobPruneArgs {
  #[command(flatten)]
  pub sharedFlags59: SharedFlags59,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobRouteArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobPaneArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags60: SharedFlags60,
  #[command(flatten)]
  pub sharedFlags61: SharedFlags61,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobSquaresArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
  #[command(flatten)]
  pub sharedFlags61: SharedFlags61,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct JobMessageArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobMessageListArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags6: SharedFlags6,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobRunArgs {
  #[command(flatten)]
  pub sharedFlags63: SharedFlags63,
  #[command(flatten)]
  pub sharedFlags64: SharedFlags64,
  #[command(flatten)]
  pub sharedFlags65: SharedFlags65,
  #[command(flatten)]
  pub sharedFlags48: SharedFlags48,
  #[command(flatten)]
  pub sharedFlags66: SharedFlags66,
  #[command(flatten)]
  pub sharedFlags67: SharedFlags67,
  #[command(flatten)]
  pub sharedFlags68: SharedFlags68,
  #[command(flatten)]
  pub sharedFlags69: SharedFlags69,
  #[command(flatten)]
  pub sharedFlags70: SharedFlags70,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct MailArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MailSendArgs {
  #[arg()]
  pub body: String,
  #[arg(long = "to")]
  pub job: String,
  #[command(flatten)]
  pub sharedFlags58: SharedFlags58,
  #[arg(long, default_value = "request")]
  pub kind: String,
  #[command(flatten)]
  pub sharedFlags56: SharedFlags56,
  #[arg(long)]
  pub no_wait: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MailRecvArgs {
  #[command(flatten)]
  pub sharedFlags58: SharedFlags58,
  #[command(flatten)]
  pub sharedFlags71: SharedFlags71,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MailWaitArgs {
  #[arg(value_name = "ID-OR-JOB")]
  pub id_or_job: Option<String>,
  #[arg(long)]
  pub me: bool,
  #[command(flatten)]
  pub sharedFlags58: SharedFlags58,
  #[command(flatten)]
  pub sharedFlags56: SharedFlags56,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MailWatchArgs {
  #[doc = "Directory containing ready `.md` files"]
  #[arg()]
  pub directory: String,
  #[doc = "Process one scan and exit; useful for supervised one-shot runs"]
  #[arg(long)]
  pub once: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbArgs {
  #[doc = "The SQL to run against ~/.agent/boop.db"]
  #[arg()]
  pub sql: Option<String>,
  #[doc = "Output format for the SQL passthrough"]
  #[arg(long, value_enum)]
  pub format: Option<Values1>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbAgentSummaryArgs {
  #[command(flatten)]
  pub sharedFlags72: SharedFlags72,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbSessionArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSessionListArgs {
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSessionGetArgs {
  #[arg()]
  pub session: String,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbTurnArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbTurnListArgs {
  #[command(flatten)]
  pub sharedFlags45: SharedFlags45,
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags75: SharedFlags75,
  #[command(flatten)]
  pub sharedFlags76: SharedFlags76,
  #[command(flatten)]
  pub sharedFlags77: SharedFlags77,
  #[command(flatten)]
  pub sharedFlags78: SharedFlags78,
  #[command(flatten)]
  pub sharedFlags79: SharedFlags79,
  #[command(flatten)]
  pub sharedFlags80: SharedFlags80,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbTurnGetArgs {
  #[arg()]
  pub session: String,
  #[arg()]
  pub turn: String,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbChatArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbChatListArgs {
  #[command(flatten)]
  pub sharedFlags45: SharedFlags45,
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags75: SharedFlags75,
  #[command(flatten)]
  pub sharedFlags76: SharedFlags76,
  #[command(flatten)]
  pub sharedFlags77: SharedFlags77,
  #[command(flatten)]
  pub sharedFlags78: SharedFlags78,
  #[command(flatten)]
  pub sharedFlags79: SharedFlags79,
  #[command(flatten)]
  pub sharedFlags80: SharedFlags80,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
  #[arg(long)]
  pub all: bool,
  #[arg(long)]
  pub follow: bool,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbTouchArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbTouchListArgs {
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags76: SharedFlags76,
  #[command(flatten)]
  pub sharedFlags77: SharedFlags77,
  #[command(flatten)]
  pub sharedFlags81: SharedFlags81,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbCommandArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbCommandListArgs {
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags76: SharedFlags76,
  #[command(flatten)]
  pub sharedFlags77: SharedFlags77,
  #[command(flatten)]
  pub sharedFlags81: SharedFlags81,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbFetchArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbFetchListArgs {
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags76: SharedFlags76,
  #[command(flatten)]
  pub sharedFlags77: SharedFlags77,
  #[command(flatten)]
  pub sharedFlags81: SharedFlags81,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbSkillArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSkillListArgs {
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags76: SharedFlags76,
  #[command(flatten)]
  pub sharedFlags77: SharedFlags77,
  #[command(flatten)]
  pub sharedFlags81: SharedFlags81,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbPrArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbPrListArgs {
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags76: SharedFlags76,
  #[command(flatten)]
  pub sharedFlags77: SharedFlags77,
  #[command(flatten)]
  pub sharedFlags81: SharedFlags81,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbSpanArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSpanListArgs {
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags76: SharedFlags76,
  #[command(flatten)]
  pub sharedFlags77: SharedFlags77,
  #[command(flatten)]
  pub sharedFlags81: SharedFlags81,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbEdgeArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbEdgeListArgs {
  #[command(flatten)]
  pub sharedFlags74: SharedFlags74,
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbUsageArgs {
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
  #[doc = "Print this alias's SQL and exit"]
  #[arg(long)]
  pub show_sql: bool,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbUsageBlocksArgs {
  #[arg(long, default_value_t = 5)]
  pub window_hours: u64,
  #[doc = "Only the window that is still open"]
  #[arg(long)]
  pub active: bool,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbUsageBurnRateArgs {
  #[arg(long, default_value_t = 60)]
  pub window_minutes: u64,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbPriceArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbPriceListArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbPriceSetArgs {
  #[arg()]
  pub model: String,
  #[arg(long)]
  pub input_per_mtok: String,
  #[arg(long)]
  pub output_per_mtok: String,
  #[arg(long)]
  pub cache_write_5m_per_mtok: String,
  #[arg(long)]
  pub cache_write_1h_per_mtok: String,
  #[arg(long)]
  pub cache_read_per_mtok: String,
  #[arg(long, default_value = "manual")]
  pub source: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbFavoriteArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbFavoriteAddArgs {
  #[doc = "Markdown file to pin; stdin when absent"]
  #[arg(long)]
  pub file: Option<String>,
  #[doc = "Why this one is kept"]
  #[arg(long)]
  pub note: Option<String>,
  #[doc = "Where it came from: a session id, a url, plain text"]
  #[arg(long)]
  pub source: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbFavoriteListArgs {
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbFavoriteShowArgs {
  #[arg()]
  pub id: String,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbFavoriteEditArgs {
  #[arg()]
  pub id: String,
  #[arg(long)]
  pub note: Option<String>,
  #[arg(long)]
  pub source: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbFavoriteDeleteArgs {
  #[arg()]
  pub id: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbSyncArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSyncCreateArgs {
  #[arg(long)]
  pub rebuild: bool,
  #[doc = "Keep syncing on a poll instead of returning"]
  #[arg(long)]
  pub forever: bool,
  #[doc = "Where the pass delivers the native-child completions it finds. A scratch mailbox here keeps an analysis pass off the live bus"]
  #[arg(long)]
  pub mail_dir: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct DbSyncCursorArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSyncCursorListArgs {
  #[command(flatten)]
  pub sharedFlags73: SharedFlags73,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSearchArgs {
  #[doc = "Text to find, case-insensitive"]
  #[arg()]
  pub text: String,
  #[command(flatten)]
  pub sharedFlags82: SharedFlags82,
  #[command(flatten)]
  pub sharedFlags83: SharedFlags83,
  #[doc = "Return only turns classified as direct human input"]
  #[arg(long)]
  pub human: bool,
  #[command(flatten)]
  pub sharedFlags84: SharedFlags84,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSessionsArgs {
  #[command(flatten)]
  pub sharedFlags82: SharedFlags82,
  #[command(flatten)]
  pub sharedFlags83: SharedFlags83,
  #[command(flatten)]
  pub sharedFlags84: SharedFlags84,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbLanesArgs {
  #[command(flatten)]
  pub sharedFlags82: SharedFlags82,
  #[command(flatten)]
  pub sharedFlags84: SharedFlags84,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbMailArgs {
  #[doc = "Lane, coordinator or native route name"]
  #[arg()]
  pub route: String,
  #[doc = "Only this kind: dispatch, result, request, completion, yield, note"]
  #[arg(long)]
  pub kind: Option<String>,
  #[command(flatten)]
  pub sharedFlags84: SharedFlags84,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSchemaArgs {
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbStatusArgs {
  #[doc = "Window in minutes"]
  #[arg(long, default_value_t = 10)]
  pub window: u64,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DebugArgs {
  #[doc = "One lane, answered in full: route, mail, worktree, transcript, alerts. Without it, the WARN/ERROR window across every lane"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[doc = "Window to read back, as `Ns`, `Nm`, `Nh` or a count of seconds"]
  #[arg(long, default_value = "2m")]
  pub since: String,
  #[doc = "One lane only, for the alert window"]
  #[arg(long = "lane", value_name = "LANE")]
  pub lane_flag: Option<String>,
  #[doc = "One JSON document, `alerts` and `sync`, instead of the grouped text"]
  #[arg(long)]
  pub json: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MeArgs {
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MeWhoamiArgs {
  #[command(flatten)]
  pub sharedFlags85: SharedFlags85,
  #[command(flatten)]
  pub sharedFlags58: SharedFlags58,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MeRegisterArgs {
  #[arg()]
  pub name: String,
  #[command(flatten)]
  pub sharedFlags45: SharedFlags45,
  #[arg(long)]
  pub parent: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MeMoodArgs {
  #[doc = "A stored mood name; `boop db \"select * from mood\"` lists them"]
  #[arg()]
  pub name: Option<String>,
  #[doc = "Drop this session's own mood row, so it inherits again"]
  #[arg(long)]
  pub clear: bool,
  #[doc = "The session to act on; defaults to the caller"]
  #[arg(long = "as")]
  pub session: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MeFavoriteArgs {
  #[doc = "Assistant turn position: -1 is newest, -2 is the one before it"]
  #[arg(default_value_t = -1)]
  pub index: i64,
  #[doc = "Why this message is kept"]
  #[arg(long)]
  pub note: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct ConfigArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct ConfigPathArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct ConfigShowArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct ConfigPresetsArgs {
  #[arg(long, value_enum, default_value = "table")]
  pub format: Values4,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct AgentArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct AgentSummaryArgs {
  #[command(flatten)]
  pub sharedFlags72: SharedFlags72,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct AgentSessionsArgs {
  #[doc = "Restrict session and shell rows to one working directory"]
  #[arg(long)]
  pub cwd: Option<String>,
  #[doc = "Include historical and inactive rows"]
  #[arg(long)]
  pub history: bool,
  #[doc = "Restrict the graph to the family connected to this tmux session or pane"]
  #[arg(long)]
  pub tmux: Option<String>,
  #[doc = "Include historical family rows active at or after this Unix timestamp in milliseconds"]
  #[arg(long)]
  pub history_since_ts: Option<String>,
  #[doc = "The public graph contract currently emits JSON"]
  #[arg(long, value_enum, default_value = "json")]
  pub format: Values5,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepArgs {
  #[doc = "A registry name, or the `parent` / `children` alias.\n\nClap cannot mark this required: `subcommand_negates_reqs` does not clear a parent positional once a `beep` subcommand matches, so `beep lane list` would fail on a missing `<ROUTE>`. The dispatch raises clap's own missing-argument error instead."]
  #[arg()]
  pub route: Option<String>,
  #[doc = "The message"]
  #[arg()]
  pub body: Option<String>,
  #[doc = "Who the row is from, when the whoami ladder cannot say"]
  #[arg(long = "as")]
  pub name: Option<String>,
  #[doc = "The mail kind the row wears"]
  #[arg(long, default_value = "request")]
  pub kind: String,
  #[doc = "Seconds to block before exiting 124"]
  #[arg(long, default_value_t = 540)]
  pub timeout: u64,
  #[doc = "Send and return, instead of blocking for the answer"]
  #[arg(long)]
  pub no_wait: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepRemindArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepRemindAddArgs {
  #[arg()]
  pub name: String,
  #[doc = "Existing explicit route name (no parent/children aliases)"]
  #[arg()]
  pub route: String,
  #[arg()]
  pub body: String,
  #[doc = "Positive interval: seconds, or suffix s/m/h (for example 30m)"]
  #[arg(long)]
  pub every: String,
  #[doc = "Required exclusive expiry: Unix seconds or RFC3339 with offset"]
  #[arg(long)]
  pub until: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepRemindListArgs {
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepRemindCancelArgs {
  #[arg()]
  pub name: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepRemindRunArgs {
  #[arg(long)]
  pub once: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepHarnessArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepHarnessListArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepHarnessGetArgs {
  #[arg()]
  pub harness: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepLaneArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneListArgs {
  #[command(flatten)]
  pub sharedFlags0: SharedFlags0,
  #[command(flatten)]
  pub sharedFlags1: SharedFlags1,
  #[command(flatten)]
  pub sharedFlags2: SharedFlags2,
  #[command(flatten)]
  pub sharedFlags3: SharedFlags3,
  #[command(flatten)]
  pub sharedFlags4: SharedFlags4,
  #[command(flatten)]
  pub sharedFlags5: SharedFlags5,
  #[command(flatten)]
  pub sharedFlags6: SharedFlags6,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneResumeArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags6: SharedFlags6,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneCreateArgs {
  #[command(flatten)]
  pub sharedFlags7: SharedFlags7,
  #[command(flatten)]
  pub sharedFlags8: SharedFlags8,
  #[command(flatten)]
  pub sharedFlags9: SharedFlags9,
  #[command(flatten)]
  pub sharedFlags10: SharedFlags10,
  #[command(flatten)]
  pub sharedFlags11: SharedFlags11,
  #[command(flatten)]
  pub sharedFlags12: SharedFlags12,
  #[command(flatten)]
  pub sharedFlags13: SharedFlags13,
  #[command(flatten)]
  pub sharedFlags14: SharedFlags14,
  #[command(flatten)]
  pub sharedFlags15: SharedFlags15,
  #[command(flatten)]
  pub sharedFlags16: SharedFlags16,
  #[command(flatten)]
  pub sharedFlags17: SharedFlags17,
  #[command(flatten)]
  pub sharedFlags18: SharedFlags18,
  #[command(flatten)]
  pub sharedFlags19: SharedFlags19,
  #[command(flatten)]
  pub sharedFlags20: SharedFlags20,
  #[command(flatten)]
  pub sharedFlags21: SharedFlags21,
  #[command(flatten)]
  pub sharedFlags22: SharedFlags22,
  #[command(flatten)]
  pub sharedFlags23: SharedFlags23,
  #[command(flatten)]
  pub sharedFlags24: SharedFlags24,
  #[command(flatten)]
  pub sharedFlags25: SharedFlags25,
  #[command(flatten)]
  pub sharedFlags26: SharedFlags26,
  #[command(flatten)]
  pub sharedFlags27: SharedFlags27,
  #[command(flatten)]
  pub sharedFlags28: SharedFlags28,
  #[command(flatten)]
  pub sharedFlags29: SharedFlags29,
  #[command(flatten)]
  pub sharedFlags30: SharedFlags30,
  #[command(flatten)]
  pub sharedFlags31: SharedFlags31,
  #[command(flatten)]
  pub sharedFlags32: SharedFlags32,
  #[command(flatten)]
  pub sharedFlags33: SharedFlags33,
  #[command(flatten)]
  pub sharedFlags6: SharedFlags6,
  #[command(flatten)]
  pub sharedFlags34: SharedFlags34,
  #[command(flatten)]
  pub sharedFlags35: SharedFlags35,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneReviveArgs {
  #[doc = "The dead route to revive. Omit for `--dead` or `--list`"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[command(flatten)]
  pub sharedFlags36: SharedFlags36,
  #[command(flatten)]
  pub sharedFlags37: SharedFlags37,
  #[command(flatten)]
  pub sharedFlags38: SharedFlags38,
  #[command(flatten)]
  pub sharedFlags39: SharedFlags39,
  #[command(flatten)]
  pub sharedFlags40: SharedFlags40,
  #[command(flatten)]
  pub sharedFlags41: SharedFlags41,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneGetArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags43: SharedFlags43,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneWhereArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLanePatchArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags44: SharedFlags44,
  #[command(flatten)]
  pub sharedFlags45: SharedFlags45,
  #[command(flatten)]
  pub sharedFlags46: SharedFlags46,
  #[command(flatten)]
  pub sharedFlags47: SharedFlags47,
  #[command(flatten)]
  pub sharedFlags48: SharedFlags48,
  #[command(flatten)]
  pub sharedFlags49: SharedFlags49,
  #[command(flatten)]
  pub sharedFlags50: SharedFlags50,
  #[command(flatten)]
  pub sharedFlags51: SharedFlags51,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneDeleteArgs {
  #[doc = "One lane: kill its pane and drop its route. Omit for a bulk delete by `--state`"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[command(flatten)]
  pub sharedFlags52: SharedFlags52,
  #[command(flatten)]
  pub sharedFlags53: SharedFlags53,
  #[command(flatten)]
  pub sharedFlags54: SharedFlags54,
  #[command(flatten)]
  pub sharedFlags55: SharedFlags55,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneRmArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneKillArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneWaitArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags56: SharedFlags56,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneAttachArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneSignalArgs {
  #[arg()]
  pub signal: String,
  #[command(flatten)]
  pub sharedFlags57: SharedFlags57,
  #[command(flatten)]
  pub sharedFlags58: SharedFlags58,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLanePruneArgs {
  #[command(flatten)]
  pub sharedFlags59: SharedFlags59,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneRouteArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLanePaneArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags60: SharedFlags60,
  #[command(flatten)]
  pub sharedFlags61: SharedFlags61,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneSquaresArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags62: SharedFlags62,
  #[command(flatten)]
  pub sharedFlags61: SharedFlags61,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepLaneMessageArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneMessageListArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags6: SharedFlags6,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneRunArgs {
  #[command(flatten)]
  pub sharedFlags63: SharedFlags63,
  #[command(flatten)]
  pub sharedFlags64: SharedFlags64,
  #[command(flatten)]
  pub sharedFlags65: SharedFlags65,
  #[command(flatten)]
  pub sharedFlags48: SharedFlags48,
  #[command(flatten)]
  pub sharedFlags66: SharedFlags66,
  #[command(flatten)]
  pub sharedFlags67: SharedFlags67,
  #[command(flatten)]
  pub sharedFlags68: SharedFlags68,
  #[command(flatten)]
  pub sharedFlags69: SharedFlags69,
  #[command(flatten)]
  pub sharedFlags70: SharedFlags70,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepAgentArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepAgentWaterfallArgs {
  #[doc = "Inclusive epoch milliseconds, or a duration such as `24h`"]
  #[arg(long = "since", value_name = "MS|DURATION")]
  pub ms_duration: String,
  #[doc = "Restrict rows to a working directory"]
  #[arg(long)]
  pub cwd: Option<String>,
  #[arg(long, value_enum, default_value = "json")]
  pub format: Values6,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepAgentRegisterArgs {
  #[doc = "The route name. Every boop call this agent makes then carries `--as <name>`: it shares its spawner's process, so no env stamp can name it"]
  #[arg()]
  pub name: String,
  #[doc = "`native` (a subagent inside a lane or coordinator process) or `coordinator` (an interactive session that owns lanes). Defaults to native for a new route; preserves the kind of an existing route"]
  #[arg(long)]
  pub kind: Option<String>,
  #[doc = "The route completion and `boop beep parent` rows go to"]
  #[arg(long)]
  pub parent: Option<String>,
  #[doc = "Recorded for this row; a pane-less agent runs no supervisor of its own, so nothing polls on its behalf"]
  #[arg(long, value_enum, default_value = "orphan")]
  pub on_parent_death: Values0,
  #[doc = "The harness a door push addresses. Without it the route is a mailbox, not an address: nothing can push to it"]
  #[arg(long)]
  pub harness: Option<String>,
  #[doc = "Observed harness thread/session ID. Required for a pane-less coordinator whose harness exposes no process-local identity"]
  #[arg(long)]
  pub session_id: Option<String>,
  #[doc = "Existing tmux pane, window or session to bind. Resolves to a pane ID"]
  #[arg(long)]
  pub tmux: Option<String>,
  #[doc = "The directory the agent works in; a hook inbox drains rows here"]
  #[arg(long)]
  pub cwd: Option<String>,
  #[doc = "The tree this agent works in. Warmed like a lane spawn's worktree, with the preamble printed here: a native has no injected first turn"]
  #[arg(long)]
  pub worktree: Option<String>,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepAgentDoneArgs {
  #[arg()]
  pub name: String,
  #[arg(long, default_value_t = 0)]
  pub rc: u64,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepAgentSubscribeArgs {
  #[doc = "A lane, or the `children` / `'*'` alias"]
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[doc = "How a commit reaches the subscriber: `door` or `mailbox`"]
  #[arg(long, default_value = "door")]
  pub mode: String,
  #[command(flatten)]
  pub sharedFlags86: SharedFlags86,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepAgentUnsubscribeArgs {
  #[doc = "A lane, or the `children` / `'*'` alias"]
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub sharedFlags86: SharedFlags86,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepMessageArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepMessageAckArgs {
  #[arg(long, value_name = "LANE")]
  pub lane: Option<String>,
  #[arg(long)]
  pub r#box: Option<String>,
  #[arg(long)]
  pub close_routeless: bool,
  #[arg(long, default_value_t = 7)]
  pub max_age_days: u64,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepForkArgs {
  #[doc = "`comment_id` in `agent_turn_comment`. Required by the bare spawn spelling `boop beep fork <id>`; `join` and `diff` take their own"]
  #[arg()]
  pub comment: Option<String>,
  #[doc = "The config preset the lane spawns from: harness, model, effort"]
  #[arg(long)]
  pub preset: Option<String>,
  #[doc = "Open the selected harness in its native interactive TUI"]
  #[arg(long)]
  pub interactive: bool,
  #[doc = "Repo to branch from; defaults to the repo the caller stands in"]
  #[arg(long)]
  pub cwd: Option<String>,
  #[command(flatten)]
  pub sharedFlags24: SharedFlags24,
  #[doc = "Print the brief path and the lane's `cmd:` line without spawning"]
  #[arg(long)]
  pub dry_run: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepForkJoinArgs {
  #[doc = "`comment_id` in `agent_turn_comment`"]
  #[arg()]
  pub comment: String,
  #[command(flatten)]
  pub sharedFlags87: SharedFlags87,
  #[doc = "Skip the merge; only write and deliver the reply"]
  #[arg(long)]
  pub no_merge: bool,
  #[doc = "Skip the reply; only merge"]
  #[arg(long)]
  pub no_reply: bool,
  #[doc = "Print the git command and the recipient, run nothing"]
  #[arg(long)]
  pub dry_run: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepForkDiffArgs {
  #[doc = "`comment_id` in `agent_turn_comment`"]
  #[arg()]
  pub comment: String,
  #[command(flatten)]
  pub sharedFlags87: SharedFlags87,
  #[doc = "Print `--stat` instead of the full diff"]
  #[arg(long)]
  pub stat: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepPasteArgs {
  #[doc = "The file to paste"]
  #[arg()]
  pub path: String,
  #[doc = "Recipient route; its registered pane and harness pick the key"]
  #[arg(long)]
  pub route: Option<String>,
  #[doc = "A tmux pane or target instead of a route (`%12`, `sess:0.1`)"]
  #[arg(long)]
  pub pane: Option<String>,
  #[doc = "Harness at that pane when `--pane` names no route (default claude)"]
  #[arg(long)]
  pub harness: Option<String>,
  #[doc = "Type the quoted path even for an image"]
  #[arg(long)]
  pub as_path: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepPsArgs {
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[doc = "Include dead routes (no live process behind the pane)"]
  #[arg(long)]
  pub all: bool,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepPstreeArgs {
  #[doc = "Include dead lanes; default is live-only"]
  #[arg(long)]
  pub all: bool,
  #[arg(long, value_enum, default_value = "text")]
  pub format: Values7,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepSelectionArgs {
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepSelectionListArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepSelectionSetArgs {
  #[arg()]
  pub route: String,
  #[arg(long)]
  pub checked: bool,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepSelectionFocusArgs {
  #[arg()]
  pub target: String,
  #[arg(long)]
  pub at: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepSelectionClearArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepShoutArgs {
  #[doc = "The message; omitted sends \"stahp what ur doing please\""]
  #[arg()]
  pub body: Option<String>,
  #[doc = "Send only to the persisted checkbox selection"]
  #[arg(long)]
  pub selected: bool,
  #[doc = "Explicit recipient routes; repeat for a one-time recipient set"]
  #[arg(long)]
  pub to: Option<String>,
  #[command(flatten)]
  pub sharedFlags88: SharedFlags88,
  #[doc = "The mail kind the rows wear"]
  #[arg(long, default_value = "hail")]
  pub kind: String,
  #[command(flatten)]
  pub sharedFlags89: SharedFlags89,
  #[command(flatten)]
  pub sharedFlags90: SharedFlags90,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepScreamArgs {
  #[doc = "The message; omitted sends \"stop what ur doing check ps\""]
  #[arg()]
  pub body: Option<String>,
  #[command(flatten)]
  pub sharedFlags88: SharedFlags88,
  #[command(flatten)]
  pub sharedFlags89: SharedFlags89,
  #[command(flatten)]
  pub sharedFlags90: SharedFlags90,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct InboxArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct InboxDrainArgs {
  #[doc = "Whose inbox to drain; defaults to the identity ladder's answer"]
  #[arg(long = "as")]
  pub name: Option<String>,
  #[command(flatten)]
  pub sharedFlags71: SharedFlags71,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct InboxHooksArgs {
  #[arg(long)]
  pub name: String,
  #[doc = "The project whose settings carry the hooks; defaults to this dir"]
  #[arg(long)]
  pub cwd: Option<String>,
  #[arg(long)]
  pub uninstall: bool,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct RemindArgs {
  #[doc = "Number of user messages to print, newest window first in chronology"]
  #[arg()]
  pub count: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct ShellInitArgs {
  #[arg(value_enum)]
  pub shell: Values8,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct TagArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagAddArgs {
  #[arg(required = true)]
  pub tag: Vec<String>,
  #[doc = "What the tags hang on: favorite:<id>, comment:<id>, lane:<name>, or any spelling the caller keeps. Defaults to the caller's route"]
  #[arg(long)]
  pub source: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagRecentArgs {
  #[arg(long, default_value_t = 5, short = 'n')]
  pub limit: u64,
  #[command(flatten)]
  pub sharedFlags91: SharedFlags91,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagSearchArgs {
  #[arg()]
  pub query: String,
  #[arg(long, default_value_t = 20, short = 'n')]
  pub limit: u64,
  #[command(flatten)]
  pub sharedFlags91: SharedFlags91,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagListArgs {
  #[command(flatten)]
  pub sharedFlags91: SharedFlags91,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagOfArgs {
  #[arg()]
  pub source: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagForArgs {
  #[arg(required = true)]
  pub source: Vec<String>,
  #[command(flatten)]
  pub sharedFlags91: SharedFlags91,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagSourcesArgs {
  #[arg()]
  pub tag: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagRmArgs {
  #[arg()]
  pub tag: String,
  #[arg(long)]
  pub source: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct TagBackfillArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TuiArgs {
  #[doc = "Registered harness adapter: claude, codex, kimi, or opencode"]
  #[arg()]
  pub harness: String,
  #[doc = "Arguments forwarded to the ordinary harness TUI"]
  #[arg(last = true)]
  pub args: Vec<String>,
  #[doc = "Executable override, for example ccz with the Claude adapter"]
  #[arg(long = "bin")]
  pub executable: Option<String>,
  #[doc = "Stable route name for later resumes; refuses an existing live owner"]
  #[arg(long)]
  pub name: Option<String>,
  #[command(flatten)]
  pub sharedFlags47: SharedFlags47,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
  #[doc = "Submit once the native composer is ready (requires tmux)"]
  #[arg(long)]
  pub initial_prompt: Option<String>,
  #[doc = "Apply an OpenCode variant before its first prompt"]
  #[arg(long)]
  pub initial_effort: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct WaitArgs {
  #[doc = "A message id or lane name. Omit to wait for all child lanes; use --me for the inbox"]
  #[arg(value_name = "ID-OR-LANE")]
  pub id_or_lane: Option<String>,
  #[doc = "Wait for the next unread mail addressed to the caller"]
  #[arg(long)]
  pub me: bool,
  #[doc = "Whose inbox to watch, when the whoami ladder cannot say"]
  #[arg(long = "as")]
  pub name: Option<String>,
  #[doc = "Seconds to block before exiting 124"]
  #[arg(long, default_value_t = 540)]
  pub wait_timeout: u64,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct WhoamiArgs {
  #[command(flatten)]
  pub sharedFlags85: SharedFlags85,
  #[doc = "Who is calling. The first rung; `--from` is the same flag"]
  #[arg(long = "as")]
  pub name: Option<String>,
  #[command(flatten)]
  pub sharedFlags42: SharedFlags42,
}
