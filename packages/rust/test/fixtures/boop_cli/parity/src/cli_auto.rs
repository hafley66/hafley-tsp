use std::io::BufRead;
use std::io::Write;

use crate::ops_auto::AgentSessionsArgs;
use crate::ops_auto::AgentSummaryArgs;
use crate::ops_auto::BeepAgentDoneArgs;
use crate::ops_auto::BeepAgentRegisterArgs;
use crate::ops_auto::BeepAgentSubscribeArgs;
use crate::ops_auto::BeepAgentUnsubscribeArgs;
use crate::ops_auto::BeepAgentWaterfallArgs;
use crate::ops_auto::BeepArgs;
use crate::ops_auto::BeepForkArgs;
use crate::ops_auto::BeepForkDiffArgs;
use crate::ops_auto::BeepForkJoinArgs;
use crate::ops_auto::BeepHarnessGetArgs;
use crate::ops_auto::BeepLaneAttachArgs;
use crate::ops_auto::BeepLaneCreateArgs;
use crate::ops_auto::BeepLaneDeleteArgs;
use crate::ops_auto::BeepLaneGetArgs;
use crate::ops_auto::BeepLaneKillArgs;
use crate::ops_auto::BeepLaneListArgs;
use crate::ops_auto::BeepLaneMessageListArgs;
use crate::ops_auto::BeepLanePaneArgs;
use crate::ops_auto::BeepLanePatchArgs;
use crate::ops_auto::BeepLanePruneArgs;
use crate::ops_auto::BeepLaneResumeArgs;
use crate::ops_auto::BeepLaneReviveArgs;
use crate::ops_auto::BeepLaneRmArgs;
use crate::ops_auto::BeepLaneRouteArgs;
use crate::ops_auto::BeepLaneRunArgs;
use crate::ops_auto::BeepLaneSignalArgs;
use crate::ops_auto::BeepLaneSquaresArgs;
use crate::ops_auto::BeepLaneWaitArgs;
use crate::ops_auto::BeepLaneWhereArgs;
use crate::ops_auto::BeepMessageAckArgs;
use crate::ops_auto::BeepPasteArgs;
use crate::ops_auto::BeepPsArgs;
use crate::ops_auto::BeepPstreeArgs;
use crate::ops_auto::BeepRemindAddArgs;
use crate::ops_auto::BeepRemindCancelArgs;
use crate::ops_auto::BeepRemindListArgs;
use crate::ops_auto::BeepRemindRunArgs;
use crate::ops_auto::BeepScreamArgs;
use crate::ops_auto::BeepSelectionArgs;
use crate::ops_auto::BeepSelectionFocusArgs;
use crate::ops_auto::BeepSelectionSetArgs;
use crate::ops_auto::BeepShoutArgs;
use crate::ops_auto::ConfigPresetsArgs;
use crate::ops_auto::DbAgentSummaryArgs;
use crate::ops_auto::DbArgs;
use crate::ops_auto::DbChatListArgs;
use crate::ops_auto::DbCommandListArgs;
use crate::ops_auto::DbEdgeListArgs;
use crate::ops_auto::DbFavoriteAddArgs;
use crate::ops_auto::DbFavoriteDeleteArgs;
use crate::ops_auto::DbFavoriteEditArgs;
use crate::ops_auto::DbFavoriteListArgs;
use crate::ops_auto::DbFavoriteShowArgs;
use crate::ops_auto::DbFetchListArgs;
use crate::ops_auto::DbLanesArgs;
use crate::ops_auto::DbMailArgs;
use crate::ops_auto::DbPrListArgs;
use crate::ops_auto::DbPriceSetArgs;
use crate::ops_auto::DbSchemaArgs;
use crate::ops_auto::DbSearchArgs;
use crate::ops_auto::DbSessionGetArgs;
use crate::ops_auto::DbSessionListArgs;
use crate::ops_auto::DbSessionsArgs;
use crate::ops_auto::DbSkillListArgs;
use crate::ops_auto::DbSpanListArgs;
use crate::ops_auto::DbStatusArgs;
use crate::ops_auto::DbSyncCreateArgs;
use crate::ops_auto::DbSyncCursorListArgs;
use crate::ops_auto::DbTouchListArgs;
use crate::ops_auto::DbTurnGetArgs;
use crate::ops_auto::DbTurnListArgs;
use crate::ops_auto::DbUsageArgs;
use crate::ops_auto::DbUsageBlocksArgs;
use crate::ops_auto::DbUsageBurnRateArgs;
use crate::ops_auto::DebugArgs;
use crate::ops_auto::InboxDrainArgs;
use crate::ops_auto::InboxHooksArgs;
use crate::ops_auto::JobAttachArgs;
use crate::ops_auto::JobCreateArgs;
use crate::ops_auto::JobDeleteArgs;
use crate::ops_auto::JobGetArgs;
use crate::ops_auto::JobKillArgs;
use crate::ops_auto::JobListArgs;
use crate::ops_auto::JobMessageListArgs;
use crate::ops_auto::JobPaneArgs;
use crate::ops_auto::JobPatchArgs;
use crate::ops_auto::JobPruneArgs;
use crate::ops_auto::JobResumeArgs;
use crate::ops_auto::JobReviveArgs;
use crate::ops_auto::JobRmArgs;
use crate::ops_auto::JobRouteArgs;
use crate::ops_auto::JobRunArgs;
use crate::ops_auto::JobSignalArgs;
use crate::ops_auto::JobSquaresArgs;
use crate::ops_auto::JobWaitArgs;
use crate::ops_auto::JobWhereArgs;
use crate::ops_auto::MailRecvArgs;
use crate::ops_auto::MailSendArgs;
use crate::ops_auto::MailWaitArgs;
use crate::ops_auto::MailWatchArgs;
use crate::ops_auto::MeArgs;
use crate::ops_auto::MeFavoriteArgs;
use crate::ops_auto::MeMoodArgs;
use crate::ops_auto::MeRegisterArgs;
use crate::ops_auto::MeWhoamiArgs;
use crate::ops_auto::OpResult;
use crate::ops_auto::RemindArgs;
use crate::ops_auto::RootArgs;
use crate::ops_auto::ShellInitArgs;
use crate::ops_auto::TagAddArgs;
use crate::ops_auto::TagForArgs;
use crate::ops_auto::TagListArgs;
use crate::ops_auto::TagOfArgs;
use crate::ops_auto::TagRecentArgs;
use crate::ops_auto::TagRmArgs;
use crate::ops_auto::TagSearchArgs;
use crate::ops_auto::TagSourcesArgs;
use crate::ops_auto::TuiArgs;
use crate::ops_auto::WaitArgs;
use crate::ops_auto::WhoamiArgs;

#[derive(clap::Parser, Debug)]
#[command(name = "boop", version, about = "Cross-harness agent transcript reader: drive jobs with `job`, read what agents did with `db`")]
pub struct Boop {
  #[command(subcommand)]
  pub cmd: Option<Cmd>,#[command(flatten)]
  pub file: RootArgs,
}

#[derive(clap::Subcommand, Debug)]
pub enum Cmd {
  #[doc = "Create and control registered agent jobs"]
  Job(JobCommand),
  #[doc = "Send, receive, and wait for addressed mail"]
  Mail(MailCommand),
  #[doc = "Run raw SQL read-only against the store (the default `db` form), or read/count what agents did through a `db` subcommand"]
  Db(DbCommand),
  #[doc = "What just went wrong: recent WARN/ERROR across the lane trails and the store's error events, grouped by lane"]
  Debug(DebugArgs),
  #[doc = "The caller's own mood and favorite messages, the only verb for either. Registering a pane is `boop tui` / `boop beep agent register` now"]
  Me(MeCommand),
  #[doc = "Inspect the boop configuration the CLI reads"]
  Config(ConfigCommand),
  #[command(hide = true)]
  #[doc = "Freshly synchronize and summarize Boop agent/runtime/activity facts"]
  Agent(AgentCommand),
  #[command(hide = true)]
  #[doc = "Mail a route and block for its answer; also the group that drives harnesses, lanes, agents and processes.\n\n`boop beep <route> <body>` is the one send. `<route>` is a lane, a coordinator, a native, `parent` (the caller's own parent edge) or `children` (every live child of the caller)."]
  Beep(BeepCommand),
  #[command(hide = true)]
  #[doc = "Mail a claude coordinator reads at a turn boundary: the hook inbox. Folded (door-only-claude-delivery): the hook inbox is a rung the delivery ladder walks on its own, not a verb a caller reaches for. The installed hook still calls `boop inbox drain`, so the group runs"]
  Inbox(InboxCommand),
  #[command(hide = true)]
  #[doc = "Print the newest user messages from the caller's tracked conversation"]
  Remind(RemindArgs),
  #[command(hide = true)]
  #[doc = "Print shell functions that route interactive harnesses through Boop. Folded (one-pane-register-path): `boop tui <harness>` is the spelling"]
  ShellInit(ShellInitArgs),
  #[command(hide = true)]
  #[doc = "The shared tag table: apply tags to any surface, read the recent five back. Search reads `agent_tag` only, never a message body"]
  Tag(TagCommand),
  #[command(hide = true)]
  #[doc = "Launch an ordinary interactive harness TUI and register this pane"]
  Tui(TuiArgs),
  #[command(hide = true)]
  #[doc = "Block until mail lands: the reply to <id>, a lane's result row, or the next unread row addressed to you with --me"]
  Wait(WaitArgs),
  #[command(hide = true)]
  #[doc = "Report the caller's own identity and which of the two rungs named it"]
  Whoami(WhoamiArgs),
}

#[derive(clap::Args, Debug)]
pub struct JobCommand {
  #[command(subcommand)]
  pub cmd: JobCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum JobCmd {
  #[doc = "Every lane, with live or dead"]
  List(JobListArgs),
  #[doc = "Continue an agent process group paused by the RSS guard"]
  Resume(JobResumeArgs),
  #[doc = "Make a worktree, spawn the agent, register the route"]
  Create(JobCreateArgs),
  #[doc = "Bring a dead `boop tui` coordinator pane back on its own session. Its route must carry harness, session_id and cwd; a live target refuses"]
  Revive(JobReviveArgs),
  #[doc = "One lane's route and state"]
  Get(JobGetArgs),
  #[doc = "The lane's worktree path alone, for `cd \"$(boop beep lane where x)\"`"]
  Where(JobWhereArgs),
  #[doc = "Compatibility spelling for rebinding a registered route to an existing pane. Preserves its kind; fresh interactive registration uses agent register"]
  Patch(JobPatchArgs),
  #[doc = "Stop a lane and forget it, or bulk-delete by state"]
  Delete(JobDeleteArgs),
  #[doc = "Forget a stopped job's route and keep its worktree and history"]
  Rm(JobRmArgs),
  #[doc = "Stop a lane process and retain its route and result history"]
  Kill(JobKillArgs),
  #[doc = "Wait for a job's result row"]
  Wait(JobWaitArgs),
  #[doc = "Attach to a job's tmux session"]
  Attach(JobAttachArgs),
  #[doc = "Send a POSIX signal to this job or its direct children"]
  Signal(JobSignalArgs),
  #[doc = "Drop routes whose tmux session is gone AND whose recorded pid, if any, is not alive. Refuses when tmux is unreachable"]
  Prune(JobPruneArgs),
  #[doc = "Which tmux pane and harness session id. Folded (audit 2026-08-25): `beep lane get` prints the same route row"]
  Route(JobRouteArgs),
  #[doc = "Show the lane's screen"]
  Pane(JobPaneArgs),
  #[doc = "The user/agent squares on the lane's screen: one per visible turn, in screen order, each with the viewport rows it sits on. Reads the pane through the multiplexer and reports the pane's own geometry, so a renderer drawing the right-margin navigator asks one verb for both"]
  Squares(JobSquaresArgs),
  #[doc = "The lane's mailbox"]
  Message(JobMessageCommand),
  #[command(hide = true)]
  #[doc = "Drive one lane conversation. This is what a lane pane runs; a human calls `lane create`, never this. Folded (audit 2026-08-25): the supervisor's entry point, spawned by `lane create`"]
  Run(JobRunArgs),
}

#[derive(clap::Args, Debug)]
pub struct JobMessageCommand {
  #[command(subcommand)]
  pub cmd: JobMessageCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum JobMessageCmd {
  #[doc = "Every mail row addressed to or sent by the lane, oldest first"]
  List(JobMessageListArgs),
}

#[derive(clap::Args, Debug)]
pub struct MailCommand {
  #[command(subcommand)]
  pub cmd: MailCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum MailCmd {
  #[doc = "Deliver a message to a registered route"]
  Send(MailSendArgs),
  #[doc = "Drain mail addressed to the caller and mark each row handed over"]
  Recv(MailRecvArgs),
  #[doc = "Wait for a reply, job result, or the next row addressed to --me"]
  Wait(MailWaitArgs),
  #[doc = "Import ready Markdown messages from a directory until stopped"]
  Watch(MailWatchArgs),
}

#[derive(clap::Args, Debug)]
#[command(subcommand_negates_reqs = true, args_conflicts_with_subcommands = true)]
pub struct DbCommand {
  #[command(flatten)]
  pub args: DbArgs,#[command(subcommand)]
  pub cmd: Option<DbCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbCmd {
  #[doc = "Versioned CASS-compatible agent/runtime/activity summary. CASS issue, reservation, and provider records are separate contracts"]
  AgentSummary(DbAgentSummaryArgs),
  #[doc = "Rows from `agent_session`: one row per transcript session. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_session\"` answers it"]
  Session(DbSessionCommand),
  #[doc = "Rows from `agent_turn`: one row per user/assistant turn. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_turn\"` answers it"]
  Turn(DbTurnCommand),
  #[doc = "`agent_turn` projected into NDJSON chat-repr turns"]
  Chat(DbChatCommand),
  #[doc = "Rows from `agent_touch`: files a session read or edited. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_touch\"` answers it"]
  Touch(DbTouchCommand),
  #[doc = "Rows from `agent_cmd`: shell commands a session ran. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_cmd\"` answers it"]
  Command(DbCommandCommand),
  #[doc = "Rows from `agent_fetch`: URLs a session fetched. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_fetch\"` answers it"]
  Fetch(DbFetchCommand),
  #[doc = "Rows from `agent_skill`: skills a session invoked. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_skill\"` answers it"]
  Skill(DbSkillCommand),
  #[doc = "Rows from `agent_pr`: pull requests a session touched. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_pr\"` answers it"]
  Pr(DbPrCommand),
  #[doc = "Rows from `agent_span`: live time spans a session recorded. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_span\"` answers it"]
  Span(DbSpanCommand),
  #[doc = "Rows from `agent_edge`: parent/child spawn edges between sessions. Folded (audit 2026-08-25): one-table dump; `boop db \"SELECT * FROM agent_edge\"` answers it"]
  Edge(DbEdgeCommand),
  #[doc = "Tokens and cost. A totals report the passthrough powers, and a parent of the row computations blocks and burn-rate; clap needs both attributes to accept the two forms"]
  Usage(DbUsageCommand),
  #[doc = "The rate table cost is computed from"]
  Price(DbPriceCommand),
  #[doc = "User-pinned markdown: save a message you want to keep, read it back"]
  Favorite(DbFavoriteCommand),
  #[doc = "Ingest new transcript bytes"]
  Sync(DbSyncCommand),
  #[doc = "How far ingest has read each transcript"]
  SyncCursor(DbSyncCursorCommand),
  #[doc = "Search every harness's turns for a text, newest first; `--days 7` is the default window. Answers \"who talked about X\" without SQL"]
  Search(DbSearchArgs),
  #[doc = "Sessions across every harness that moved in the window, newest first"]
  Sessions(DbSessionsArgs),
  #[doc = "Lanes spawned in the window, newest first, with the rc of each one's result row"]
  Lanes(DbLanesArgs),
  #[doc = "Mail to or from one route, newest first"]
  Mail(DbMailArgs),
  #[doc = "Every table and view with its columns and join keys, so a query never starts with a probe of `sqlite_master`"]
  Schema(DbSchemaArgs),
  #[doc = "Who is alive, who moved recently, and what it cost"]
  Status(DbStatusArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbSessionCommand {
  #[command(subcommand)]
  pub cmd: DbSessionCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbSessionCmd {
  #[doc = "Every session row from `agent_session`, newest first"]
  List(DbSessionListArgs),
  #[doc = "The one `agent_session` row matching this session id"]
  Get(DbSessionGetArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbTurnCommand {
  #[command(subcommand)]
  pub cmd: DbTurnCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbTurnCmd {
  #[doc = "Every `agent_turn` row matching `QueryArgs`"]
  List(DbTurnListArgs),
  #[doc = "The one `agent_turn` row at this session and turn number"]
  Get(DbTurnGetArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbChatCommand {
  #[command(subcommand)]
  pub cmd: DbChatCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbChatCmd {
  #[doc = "`agent_turn` rows projected into chat-repr NDJSON turns"]
  List(DbChatListArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbTouchCommand {
  #[command(subcommand)]
  pub cmd: DbTouchCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbTouchCmd {
  #[doc = "The fact rows for this kind's table, filtered by `FactArgs`"]
  List(DbTouchListArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbCommandCommand {
  #[command(subcommand)]
  pub cmd: DbCommandCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbCommandCmd {
  #[doc = "The fact rows for this kind's table, filtered by `FactArgs`"]
  List(DbCommandListArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbFetchCommand {
  #[command(subcommand)]
  pub cmd: DbFetchCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbFetchCmd {
  #[doc = "The fact rows for this kind's table, filtered by `FactArgs`"]
  List(DbFetchListArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbSkillCommand {
  #[command(subcommand)]
  pub cmd: DbSkillCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbSkillCmd {
  #[doc = "The fact rows for this kind's table, filtered by `FactArgs`"]
  List(DbSkillListArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbPrCommand {
  #[command(subcommand)]
  pub cmd: DbPrCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbPrCmd {
  #[doc = "The fact rows for this kind's table, filtered by `FactArgs`"]
  List(DbPrListArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbSpanCommand {
  #[command(subcommand)]
  pub cmd: DbSpanCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbSpanCmd {
  #[doc = "The fact rows for this kind's table, filtered by `FactArgs`"]
  List(DbSpanListArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbEdgeCommand {
  #[command(subcommand)]
  pub cmd: DbEdgeCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbEdgeCmd {
  #[doc = "Every `agent_edge` row, filtered to one session's edges when given"]
  List(DbEdgeListArgs),
}

#[derive(clap::Args, Debug)]
#[command(subcommand_negates_reqs = true, args_conflicts_with_subcommands = true)]
pub struct DbUsageCommand {
  #[command(flatten)]
  pub args: DbUsageArgs,#[command(subcommand)]
  pub cmd: Option<DbUsageCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbUsageCmd {
  #[doc = "Gap-aware billing windows"]
  Blocks(DbUsageBlocksArgs),
  #[doc = "Tokens per minute and dollars per hour over a trailing window"]
  BurnRate(DbUsageBurnRateArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbPriceCommand {
  #[command(subcommand)]
  pub cmd: DbPriceCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbPriceCmd {
  #[doc = "Every rate row in `model_price`"]
  List,
  #[doc = "Write one rate row by hand, in USD per million tokens"]
  Set(DbPriceSetArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbFavoriteCommand {
  #[command(subcommand)]
  pub cmd: DbFavoriteCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbFavoriteCmd {
  #[doc = "Pin markdown into the store, from --file or stdin"]
  Add(DbFavoriteAddArgs),
  #[doc = "Favorites newest-first, body included"]
  List(DbFavoriteListArgs),
  #[doc = "One favorite by id, body included"]
  Show(DbFavoriteShowArgs),
  #[doc = "Rewrite the note and/or source of one favorite; the body is immutable"]
  Edit(DbFavoriteEditArgs),
  #[doc = "Drop one favorite by id; its markdown body stays cached"]
  Delete(DbFavoriteDeleteArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbSyncCommand {
  #[command(subcommand)]
  pub cmd: DbSyncCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbSyncCmd {
  #[doc = "Ingest new transcript bytes into the store's `agent_turn` and fact tables"]
  Create(DbSyncCreateArgs),
}

#[derive(clap::Args, Debug)]
pub struct DbSyncCursorCommand {
  #[command(subcommand)]
  pub cmd: DbSyncCursorCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbSyncCursorCmd {
  #[doc = "Every `sync_cursor` row: how far ingest has read each transcript"]
  List(DbSyncCursorListArgs),
}

#[derive(clap::Args, Debug)]
#[command(subcommand_required = true)]
pub struct MeCommand {
  #[command(flatten)]
  pub args: MeArgs,#[command(subcommand)]
  pub cmd: Option<MeCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum MeCmd {
  #[doc = "Report which identity rung names the caller"]
  Whoami(MeWhoamiArgs),
  #[doc = "Register a pane-less route for a native coordinator or subagent"]
  Register(MeRegisterArgs),
  #[doc = "Read or set the format agents mail this session in. No name prints the effective mood and the session that set it"]
  Mood(MeMoodArgs),
  #[doc = "Save one assistant turn from the caller's conversation as a favorite"]
  Favorite(MeFavoriteArgs),
}

#[derive(clap::Args, Debug)]
pub struct ConfigCommand {
  #[command(subcommand)]
  pub cmd: ConfigCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum ConfigCmd {
  #[doc = "Print the resolved config path"]
  Path,
  #[doc = "Print the loaded config as pretty JSON, including the defaults a missing file produces"]
  Show,
  #[doc = "One row per model preset: name, model, variant, the harness the model spelling names, and which row `default-model-preset` points at"]
  Presets(ConfigPresetsArgs),
}

#[derive(clap::Args, Debug)]
pub struct AgentCommand {
  #[command(subcommand)]
  pub cmd: AgentCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum AgentCmd {
  #[doc = "Synchronize incremental transcript facts, then emit the versioned CASS-compatible Boop agent summary"]
  Summary(AgentSummaryArgs),
  #[doc = "Synchronize transcripts, then emit the native session graph"]
  Sessions(AgentSessionsArgs),
}

#[derive(clap::Args, Debug)]
#[command(subcommand_negates_reqs = true, args_conflicts_with_subcommands = true)]
pub struct BeepCommand {
  #[command(flatten)]
  pub args: BeepArgs,#[command(subcommand)]
  pub cmd: Option<BeepCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepCmd {
  #[doc = "Expiring recurring reminders to existing routes"]
  Remind(BeepRemindCommand),
  #[doc = "Harness adapters and what each can do"]
  Harness(BeepHarnessCommand),
  #[doc = "Lanes: the agents boop spawns and tracks"]
  Lane(BeepLaneCommand),
  #[doc = "Register pane-less coordinators and native subagents"]
  Agent(BeepAgentCommand),
  #[doc = "Mail across lanes; the one verb `ack` has no other spelling"]
  Message(BeepMessageCommand),
  #[doc = "Fork a lane off a stored terminal comment: the quoted turns and the note become the brief, the lane runs on `--preset` from the caller's repo, and the link is kept in `agent_turn_comment_fork`. The `join` and `diff` verbs bring the fork back"]
  Fork(BeepForkCommand),
  #[doc = "Put a file on the OS pasteboard and press the recipient's paste key in its pane, so a TUI that reads images off the pasteboard (claude, codex: Ctrl+V) takes the picture the way a hand paste would. Text and files the harness cannot read that way land as a quoted path instead"]
  Paste(BeepPasteArgs),
  #[doc = "pid, rss, cpu, uptime, child count per live lane"]
  Ps(BeepPsArgs),
  #[doc = "Filesystem-style tree of lanes by parent edge. Folded (audit 2026-08-25): `beep lane list` carries the parent column"]
  Pstree(BeepPstreeArgs),
  #[doc = "Persistent recipient selection: list live harness panes, tick one route, record focus, or clear the set"]
  Selection(BeepSelectionCommand),
  #[doc = "One row to every connected agent (live panes and registered pane-less routes), the caller excepted. The stop-gap broadcast"]
  Shout(BeepShoutArgs),
  #[doc = "Interrupt busy agents with one declared harness key before delivering the message. Idle and unknown TUIs take no keys; lanes take cancel rows"]
  Scream(BeepScreamArgs),
}

#[derive(clap::Args, Debug)]
pub struct BeepRemindCommand {
  #[command(subcommand)]
  pub cmd: BeepRemindCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepRemindCmd {
  #[doc = "Persist a named schedule. First delivery is one interval from now"]
  Add(BeepRemindAddArgs),
  #[doc = "JSON schedules, outstanding message ids and latest scheduler detail"]
  List(BeepRemindListArgs),
  #[doc = "Stop future delivery. Already accepted harness work cannot be retracted"]
  Cancel(BeepRemindCancelArgs),
  #[doc = "Foreground runner, one per mail dir; restart resumes persisted due times. At most one outstanding occurrence per route; a turn-end or threaded reply releases it. Unknown/crashed delivery stays outstanding (inspect with db). Missed intervals collapse to one. No agents are spawned. Prefer foreground for native doors; --once needs separately persisted completion receipts"]
  Run(BeepRemindRunArgs),
}

#[derive(clap::Args, Debug)]
pub struct BeepHarnessCommand {
  #[command(subcommand)]
  pub cmd: BeepHarnessCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepHarnessCmd {
  List,
  Get(BeepHarnessGetArgs),
}

#[derive(clap::Args, Debug)]
pub struct BeepLaneCommand {
  #[command(subcommand)]
  pub cmd: BeepLaneCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepLaneCmd {
  #[doc = "Every lane, with live or dead"]
  List(BeepLaneListArgs),
  #[doc = "Continue an agent process group paused by the RSS guard"]
  Resume(BeepLaneResumeArgs),
  #[doc = "Make a worktree, spawn the agent, register the route"]
  Create(BeepLaneCreateArgs),
  #[doc = "Bring a dead `boop tui` coordinator pane back on its own session. Its route must carry harness, session_id and cwd; a live target refuses"]
  Revive(BeepLaneReviveArgs),
  #[doc = "One lane's route and state"]
  Get(BeepLaneGetArgs),
  #[doc = "The lane's worktree path alone, for `cd \"$(boop beep lane where x)\"`"]
  Where(BeepLaneWhereArgs),
  #[doc = "Compatibility spelling for rebinding a registered route to an existing pane. Preserves its kind; fresh interactive registration uses agent register"]
  Patch(BeepLanePatchArgs),
  #[doc = "Stop a lane and forget it, or bulk-delete by state"]
  Delete(BeepLaneDeleteArgs),
  #[doc = "Forget a stopped job's route and keep its worktree and history"]
  Rm(BeepLaneRmArgs),
  #[doc = "Stop a lane process and retain its route and result history"]
  Kill(BeepLaneKillArgs),
  #[doc = "Wait for a job's result row"]
  Wait(BeepLaneWaitArgs),
  #[doc = "Attach to a job's tmux session"]
  Attach(BeepLaneAttachArgs),
  #[doc = "Send a POSIX signal to this job or its direct children"]
  Signal(BeepLaneSignalArgs),
  #[doc = "Drop routes whose tmux session is gone AND whose recorded pid, if any, is not alive. Refuses when tmux is unreachable"]
  Prune(BeepLanePruneArgs),
  #[doc = "Which tmux pane and harness session id. Folded (audit 2026-08-25): `beep lane get` prints the same route row"]
  Route(BeepLaneRouteArgs),
  #[doc = "Show the lane's screen"]
  Pane(BeepLanePaneArgs),
  #[doc = "The user/agent squares on the lane's screen: one per visible turn, in screen order, each with the viewport rows it sits on. Reads the pane through the multiplexer and reports the pane's own geometry, so a renderer drawing the right-margin navigator asks one verb for both"]
  Squares(BeepLaneSquaresArgs),
  #[doc = "The lane's mailbox"]
  Message(BeepLaneMessageCommand),
  #[command(hide = true)]
  #[doc = "Drive one lane conversation. This is what a lane pane runs; a human calls `lane create`, never this. Folded (audit 2026-08-25): the supervisor's entry point, spawned by `lane create`"]
  Run(BeepLaneRunArgs),
}

#[derive(clap::Args, Debug)]
pub struct BeepLaneMessageCommand {
  #[command(subcommand)]
  pub cmd: BeepLaneMessageCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepLaneMessageCmd {
  #[doc = "Every mail row addressed to or sent by the lane, oldest first"]
  List(BeepLaneMessageListArgs),
}

#[derive(clap::Args, Debug)]
pub struct BeepAgentCommand {
  #[command(subcommand)]
  pub cmd: BeepAgentCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepAgentCmd {
  #[doc = "One row set of lane lifespans, events, live spans and parent edges"]
  Waterfall(BeepAgentWaterfallArgs),
  #[doc = "Register or update a native/coordinator route. Omitted fields are preserved"]
  Register(BeepAgentRegisterArgs),
  #[doc = "Append a completion row and remove the registry row"]
  Done(BeepAgentDoneArgs),
  #[doc = "Receive a lane's commits as pushes. `<lane>` names one lane, `children` every current child plus a wildcard, `'*'` every lane the caller parents"]
  Subscribe(BeepAgentSubscribeArgs),
  #[doc = "Stop receiving a lane's commit pushes"]
  Unsubscribe(BeepAgentUnsubscribeArgs),
}

#[derive(clap::Args, Debug)]
pub struct BeepMessageCommand {
  #[command(subcommand)]
  pub cmd: BeepMessageCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepMessageCmd {
  #[doc = "Mark mail handled, in bulk. Folded (audit 2026-08-25): age-based bulk-mark proves no read and no compliance"]
  Ack(BeepMessageAckArgs),
}

#[derive(clap::Args, Debug)]
#[command(subcommand_negates_reqs = true, args_conflicts_with_subcommands = true)]
pub struct BeepForkCommand {
  #[command(flatten)]
  pub args: BeepForkArgs,#[command(subcommand)]
  pub cmd: Option<BeepForkCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepForkCmd {
  #[doc = "Merge the fork's branch into the caller's repo and deliver the lane's last assistant turn to the fork's parent"]
  Join(BeepForkJoinArgs),
  #[doc = "Print `git diff <base>..<branch>` for the fork"]
  Diff(BeepForkDiffArgs),
}

#[derive(clap::Args, Debug)]
#[command(subcommand_required = true)]
pub struct BeepSelectionCommand {
  #[command(flatten)]
  pub args: BeepSelectionArgs,#[command(subcommand)]
  pub cmd: Option<BeepSelectionCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepSelectionCmd {
  #[doc = "List live Boop-controlled panes, most recently focused first"]
  List,
  #[doc = "Change one route's checkbox without replacing other selections"]
  Set(BeepSelectionSetArgs),
  #[doc = "Record a human focus event for a tmux session or pane"]
  Focus(BeepSelectionFocusArgs),
  #[doc = "Clear the selected recipient set"]
  Clear,
}

#[derive(clap::Args, Debug)]
pub struct InboxCommand {
  #[command(subcommand)]
  pub cmd: InboxCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum InboxCmd {
  #[doc = "Print the unread mail addressed to a coordinator and record it as handed over. Silent with an empty inbox, so a hook that runs on every turn costs one line of nothing"]
  Drain(InboxDrainArgs),
  #[doc = "Install (or remove) the two drain hooks in <cwd>/.claude/settings.json. Route registration is separate: `boop beep agent register NAME`"]
  Hooks(InboxHooksArgs),
}

#[derive(clap::Args, Debug)]
pub struct TagCommand {
  #[command(subcommand)]
  pub cmd: TagCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum TagCmd {
  #[doc = "Apply one or more tags to a source"]
  Add(TagAddArgs),
  #[doc = "The recently used tags, newest use first"]
  Recent(TagRecentArgs),
  #[doc = "Substring match on the tag column; no message body is read"]
  Search(TagSearchArgs),
  #[doc = "Every tag, most used first"]
  List(TagListArgs),
  #[doc = "The tags one source carries"]
  Of(TagOfArgs),
  #[doc = "The tags several sources carry, one read for the batch"]
  For(TagForArgs),
  #[doc = "The sources one tag hangs on"]
  Sources(TagSourcesArgs),
  #[doc = "Take one tag off one source"]
  Rm(TagRmArgs),
  #[doc = "Favorite notes become tags, once"]
  Backfill,
}

pub fn run(cli: Boop, input: &mut dyn BufRead, out: &mut dyn Write) -> OpResult<()> {
  let _ = input;
  match cli.cmd {
          Some(Cmd::Job(group)) => {
  match group.cmd {
          JobCmd::List(args) => { crate::ops::job_list(&args)?; }
          JobCmd::Resume(args) => { crate::ops::job_resume(&args)?; }
          JobCmd::Create(args) => { crate::ops::job_create(&args)?; }
          JobCmd::Revive(args) => { crate::ops::job_revive(&args)?; }
          JobCmd::Get(args) => { crate::ops::job_get(&args)?; }
          JobCmd::Where(args) => { crate::ops::job_where(&args)?; }
          JobCmd::Patch(args) => { crate::ops::job_patch(&args)?; }
          JobCmd::Delete(args) => { crate::ops::job_delete(&args)?; }
          JobCmd::Rm(args) => { crate::ops::job_rm(&args)?; }
          JobCmd::Kill(args) => { crate::ops::job_kill(&args)?; }
          JobCmd::Wait(args) => { crate::ops::job_wait(&args)?; }
          JobCmd::Attach(args) => { crate::ops::job_attach(&args)?; }
          JobCmd::Signal(args) => { crate::ops::job_signal(&args)?; }
          JobCmd::Prune(args) => { crate::ops::job_prune(&args)?; }
          JobCmd::Route(args) => { crate::ops::job_route(&args)?; }
          JobCmd::Pane(args) => { crate::ops::job_pane(&args)?; }
          JobCmd::Squares(args) => { crate::ops::job_squares(&args)?; }
          JobCmd::Message(group) => {
  match group.cmd {
          JobMessageCmd::List(args) => { crate::ops::job_message_list(&args)?; }
  }
  }
          JobCmd::Run(args) => { crate::ops::job_run(&args)?; }
  }
  }
          Some(Cmd::Mail(group)) => {
  match group.cmd {
          MailCmd::Send(args) => { crate::ops::mail_send(&args)?; }
          MailCmd::Recv(args) => { crate::ops::mail_recv(&args)?; }
          MailCmd::Wait(args) => { crate::ops::mail_wait(&args)?; }
          MailCmd::Watch(args) => { crate::ops::mail_watch(&args)?; }
  }
  }
          Some(Cmd::Db(group)) => {
  match group.cmd {
          Some(DbCmd::AgentSummary(args)) => { crate::ops::db_agent_summary(&args)?; }
          Some(DbCmd::Session(group)) => {
  match group.cmd {
          DbSessionCmd::List(args) => { crate::ops::db_session_list(&args)?; }
          DbSessionCmd::Get(args) => { crate::ops::db_session_get(&args)?; }
  }
  }
          Some(DbCmd::Turn(group)) => {
  match group.cmd {
          DbTurnCmd::List(args) => { crate::ops::db_turn_list(&args)?; }
          DbTurnCmd::Get(args) => { crate::ops::db_turn_get(&args)?; }
  }
  }
          Some(DbCmd::Chat(group)) => {
  match group.cmd {
          DbChatCmd::List(args) => { crate::ops::db_chat_list(&args)?; }
  }
  }
          Some(DbCmd::Touch(group)) => {
  match group.cmd {
          DbTouchCmd::List(args) => { crate::ops::db_touch_list(&args)?; }
  }
  }
          Some(DbCmd::Command(group)) => {
  match group.cmd {
          DbCommandCmd::List(args) => { crate::ops::db_command_list(&args)?; }
  }
  }
          Some(DbCmd::Fetch(group)) => {
  match group.cmd {
          DbFetchCmd::List(args) => { crate::ops::db_fetch_list(&args)?; }
  }
  }
          Some(DbCmd::Skill(group)) => {
  match group.cmd {
          DbSkillCmd::List(args) => { crate::ops::db_skill_list(&args)?; }
  }
  }
          Some(DbCmd::Pr(group)) => {
  match group.cmd {
          DbPrCmd::List(args) => { crate::ops::db_pr_list(&args)?; }
  }
  }
          Some(DbCmd::Span(group)) => {
  match group.cmd {
          DbSpanCmd::List(args) => { crate::ops::db_span_list(&args)?; }
  }
  }
          Some(DbCmd::Edge(group)) => {
  match group.cmd {
          DbEdgeCmd::List(args) => { crate::ops::db_edge_list(&args)?; }
  }
  }
          Some(DbCmd::Usage(group)) => {
  match group.cmd {
          Some(DbUsageCmd::Blocks(args)) => { crate::ops::db_usage_blocks(&args)?; }
          Some(DbUsageCmd::BurnRate(args)) => { crate::ops::db_usage_burn_rate(&args)?; }
          None => { let args = group.args; crate::ops::db_usage(&args)?; }
  }
  }
          Some(DbCmd::Price(group)) => {
  match group.cmd {
          DbPriceCmd::List => { let args = Default::default(); crate::ops::db_price_list(&args)?; }
          DbPriceCmd::Set(args) => { crate::ops::db_price_set(&args)?; }
  }
  }
          Some(DbCmd::Favorite(group)) => {
  match group.cmd {
          DbFavoriteCmd::Add(args) => { crate::ops::db_favorite_add(&args)?; }
          DbFavoriteCmd::List(args) => { crate::ops::db_favorite_list(&args)?; }
          DbFavoriteCmd::Show(args) => { crate::ops::db_favorite_show(&args)?; }
          DbFavoriteCmd::Edit(args) => { crate::ops::db_favorite_edit(&args)?; }
          DbFavoriteCmd::Delete(args) => { crate::ops::db_favorite_delete(&args)?; }
  }
  }
          Some(DbCmd::Sync(group)) => {
  match group.cmd {
          DbSyncCmd::Create(args) => { crate::ops::db_sync_create(&args)?; }
  }
  }
          Some(DbCmd::SyncCursor(group)) => {
  match group.cmd {
          DbSyncCursorCmd::List(args) => { crate::ops::db_sync_cursor_list(&args)?; }
  }
  }
          Some(DbCmd::Search(args)) => { crate::ops::db_search(&args)?; }
          Some(DbCmd::Sessions(args)) => { crate::ops::db_sessions(&args)?; }
          Some(DbCmd::Lanes(args)) => { crate::ops::db_lanes(&args)?; }
          Some(DbCmd::Mail(args)) => { crate::ops::db_mail(&args)?; }
          Some(DbCmd::Schema(args)) => { crate::ops::db_schema(&args)?; }
          Some(DbCmd::Status(args)) => { crate::ops::db_status(&args)?; }
          None => { let args = group.args; crate::ops::db(&args)?; }
  }
  }
          Some(Cmd::Debug(args)) => { crate::ops::debug(&args)?; }
          Some(Cmd::Me(group)) => {
  match group.cmd {
          Some(MeCmd::Whoami(args)) => { crate::ops::me_whoami(&args)?; }
          Some(MeCmd::Register(args)) => { crate::ops::me_register(&args)?; }
          Some(MeCmd::Mood(args)) => { crate::ops::me_mood(&args)?; }
          Some(MeCmd::Favorite(args)) => { crate::ops::me_favorite(&args)?; }
          None => { let args = group.args; crate::ops::me(&args)?; }
  }
  }
          Some(Cmd::Config(group)) => {
  match group.cmd {
          ConfigCmd::Path => { let args = Default::default(); crate::ops::config_path(&args)?; }
          ConfigCmd::Show => { let args = Default::default(); crate::ops::config_show(&args)?; }
          ConfigCmd::Presets(args) => { crate::ops::config_presets(&args)?; }
  }
  }
          Some(Cmd::Agent(group)) => {
  match group.cmd {
          AgentCmd::Summary(args) => { crate::ops::agent_summary(&args)?; }
          AgentCmd::Sessions(args) => { crate::ops::agent_sessions(&args)?; }
  }
  }
          Some(Cmd::Beep(group)) => {
  match group.cmd {
          Some(BeepCmd::Remind(group)) => {
  match group.cmd {
          BeepRemindCmd::Add(args) => { crate::ops::beep_remind_add(&args)?; }
          BeepRemindCmd::List(args) => { crate::ops::beep_remind_list(&args)?; }
          BeepRemindCmd::Cancel(args) => { crate::ops::beep_remind_cancel(&args)?; }
          BeepRemindCmd::Run(args) => { crate::ops::beep_remind_run(&args)?; }
  }
  }
          Some(BeepCmd::Harness(group)) => {
  match group.cmd {
          BeepHarnessCmd::List => { let args = Default::default(); crate::ops::beep_harness_list(&args)?; }
          BeepHarnessCmd::Get(args) => { crate::ops::beep_harness_get(&args)?; }
  }
  }
          Some(BeepCmd::Lane(group)) => {
  match group.cmd {
          BeepLaneCmd::List(args) => { crate::ops::beep_lane_list(&args)?; }
          BeepLaneCmd::Resume(args) => { crate::ops::beep_lane_resume(&args)?; }
          BeepLaneCmd::Create(args) => { crate::ops::beep_lane_create(&args)?; }
          BeepLaneCmd::Revive(args) => { crate::ops::beep_lane_revive(&args)?; }
          BeepLaneCmd::Get(args) => { crate::ops::beep_lane_get(&args)?; }
          BeepLaneCmd::Where(args) => { crate::ops::beep_lane_where(&args)?; }
          BeepLaneCmd::Patch(args) => { crate::ops::beep_lane_patch(&args)?; }
          BeepLaneCmd::Delete(args) => { crate::ops::beep_lane_delete(&args)?; }
          BeepLaneCmd::Rm(args) => { crate::ops::beep_lane_rm(&args)?; }
          BeepLaneCmd::Kill(args) => { crate::ops::beep_lane_kill(&args)?; }
          BeepLaneCmd::Wait(args) => { crate::ops::beep_lane_wait(&args)?; }
          BeepLaneCmd::Attach(args) => { crate::ops::beep_lane_attach(&args)?; }
          BeepLaneCmd::Signal(args) => { crate::ops::beep_lane_signal(&args)?; }
          BeepLaneCmd::Prune(args) => { crate::ops::beep_lane_prune(&args)?; }
          BeepLaneCmd::Route(args) => { crate::ops::beep_lane_route(&args)?; }
          BeepLaneCmd::Pane(args) => { crate::ops::beep_lane_pane(&args)?; }
          BeepLaneCmd::Squares(args) => { crate::ops::beep_lane_squares(&args)?; }
          BeepLaneCmd::Message(group) => {
  match group.cmd {
          BeepLaneMessageCmd::List(args) => { crate::ops::beep_lane_message_list(&args)?; }
  }
  }
          BeepLaneCmd::Run(args) => { crate::ops::beep_lane_run(&args)?; }
  }
  }
          Some(BeepCmd::Agent(group)) => {
  match group.cmd {
          BeepAgentCmd::Waterfall(args) => { crate::ops::beep_agent_waterfall(&args)?; }
          BeepAgentCmd::Register(args) => { crate::ops::beep_agent_register(&args)?; }
          BeepAgentCmd::Done(args) => { crate::ops::beep_agent_done(&args)?; }
          BeepAgentCmd::Subscribe(args) => { crate::ops::beep_agent_subscribe(&args)?; }
          BeepAgentCmd::Unsubscribe(args) => { crate::ops::beep_agent_unsubscribe(&args)?; }
  }
  }
          Some(BeepCmd::Message(group)) => {
  match group.cmd {
          BeepMessageCmd::Ack(args) => { crate::ops::beep_message_ack(&args)?; }
  }
  }
          Some(BeepCmd::Fork(group)) => {
  match group.cmd {
          Some(BeepForkCmd::Join(args)) => { crate::ops::beep_fork_join(&args)?; }
          Some(BeepForkCmd::Diff(args)) => { crate::ops::beep_fork_diff(&args)?; }
          None => { let args = group.args; crate::ops::beep_fork(&args)?; }
  }
  }
          Some(BeepCmd::Paste(args)) => { crate::ops::beep_paste(&args)?; }
          Some(BeepCmd::Ps(args)) => { crate::ops::beep_ps(&args)?; }
          Some(BeepCmd::Pstree(args)) => { crate::ops::beep_pstree(&args)?; }
          Some(BeepCmd::Selection(group)) => {
  match group.cmd {
          Some(BeepSelectionCmd::List) => { let args = Default::default(); crate::ops::beep_selection_list(&args)?; }
          Some(BeepSelectionCmd::Set(args)) => { crate::ops::beep_selection_set(&args)?; }
          Some(BeepSelectionCmd::Focus(args)) => { crate::ops::beep_selection_focus(&args)?; }
          Some(BeepSelectionCmd::Clear) => { let args = Default::default(); crate::ops::beep_selection_clear(&args)?; }
          None => { let args = group.args; crate::ops::beep_selection(&args)?; }
  }
  }
          Some(BeepCmd::Shout(args)) => { crate::ops::beep_shout(&args)?; }
          Some(BeepCmd::Scream(args)) => { crate::ops::beep_scream(&args)?; }
          None => { let args = group.args; crate::ops::beep(&args)?; }
  }
  }
          Some(Cmd::Inbox(group)) => {
  match group.cmd {
          InboxCmd::Drain(args) => { crate::ops::inbox_drain(&args)?; }
          InboxCmd::Hooks(args) => { crate::ops::inbox_hooks(&args)?; }
  }
  }
          Some(Cmd::Remind(args)) => { crate::ops::remind(&args)?; }
          Some(Cmd::ShellInit(args)) => { crate::ops::shell_init(&args)?; }
          Some(Cmd::Tag(group)) => {
  match group.cmd {
          TagCmd::Add(args) => { crate::ops::tag_add(&args)?; }
          TagCmd::Recent(args) => { crate::ops::tag_recent(&args)?; }
          TagCmd::Search(args) => { crate::ops::tag_search(&args)?; }
          TagCmd::List(args) => { crate::ops::tag_list(&args)?; }
          TagCmd::Of(args) => { crate::ops::tag_of(&args)?; }
          TagCmd::For(args) => { crate::ops::tag_for(&args)?; }
          TagCmd::Sources(args) => { crate::ops::tag_sources(&args)?; }
          TagCmd::Rm(args) => { crate::ops::tag_rm(&args)?; }
          TagCmd::Backfill => { let args = Default::default(); crate::ops::tag_backfill(&args)?; }
  }
  }
          Some(Cmd::Tui(args)) => { crate::ops::tui(&args)?; }
          Some(Cmd::Wait(args)) => { crate::ops::wait(&args)?; }
          Some(Cmd::Whoami(args)) => { crate::ops::whoami(&args)?; }
          None => { let args = cli.file; crate::ops::root(&args)?; }
  }
  Ok(())
}

pub fn main(cli: Boop) -> std::process::ExitCode {
  let stdin = std::io::stdin();
  let stdout = std::io::stdout();
  match run(cli, &mut stdin.lock(), &mut stdout.lock()) {
      Ok(()) => std::process::ExitCode::SUCCESS,
      Err(e) => {
          eprintln!("error: {e}");
          std::process::ExitCode::FAILURE
      }
  }
}

fn write_json<T: serde::Serialize>(out: &mut dyn Write, value: &T) -> OpResult<()> {
    serde_json::to_writer(&mut *out, value)?;
    out.write_all(b"\n")?;
    Ok(())
}
