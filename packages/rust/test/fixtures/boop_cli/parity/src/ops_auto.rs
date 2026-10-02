use crate::models::all_flag::AllFlag;
use crate::models::as_flag::AsFlag;
use crate::models::as_the_subscriber_defaults_to_flag::AsTheSubscriberDefaultsToFlag;
use crate::models::as_who_the_rows_are_flag::AsWhoTheRowsAreFlag;
use crate::models::base_sha_flag::BaseShaFlag;
use crate::models::bin_flag::BinFlag;
use crate::models::bin_the_executable_the_harness_flag::BinTheExecutableTheHarnessFlag;
use crate::models::branch_flag::BranchFlag;
use crate::models::brief_absolute_path_to_the_flag::BriefAbsolutePathToTheFlag;
use crate::models::brief_flag::BriefFlag;
use crate::models::children_flag::ChildrenFlag;
use crate::models::commit_push_flag::CommitPushFlag;
use crate::models::cwd_flag::CwdFlag;
use crate::models::cwd_string_optional_flag::CwdStringOptionalFlag;
use crate::models::days_flag::DaysFlag;
use crate::models::dead_flag::DeadFlag;
use crate::models::dry_run_flag::DryRunFlag;
use crate::models::dry_run_print_what_a_single_flag::DryRunPrintWhatASingleFlag;
use crate::models::dry_run_print_what_would_be_flag::DryRunPrintWhatWouldBeFlag;
use crate::models::effort_flag::EffortFlag;
use crate::models::env_flag::EnvFlag;
use crate::models::expect_commit_subject_flag::ExpectCommitSubjectFlag;
use crate::models::expect_commits_at_least_flag::ExpectCommitsAtLeastFlag;
use crate::models::expect_path_flag::ExpectPathFlag;
use crate::models::format_flag::FormatFlag;
use crate::models::format_text_json_optional_json_flag::FormatTextJsonOptionalJsonFlag;
use crate::models::format_text_json_optional_text_flag::FormatTextJsonOptionalTextFlag;
use crate::models::goal_flag::GoalFlag;
use crate::models::goal_string_optional_flag::GoalStringOptionalFlag;
use crate::models::harness_flag::HarnessFlag;
use crate::models::harness_only_this_harness_claude_flag::HarnessOnlyThisHarnessClaudeFlag;
use crate::models::harness_string_optional_flag::HarnessStringOptionalFlag;
use crate::models::harness_string_required_flag::HarnessStringRequiredFlag;
use crate::models::hook_flag::HookFlag;
use crate::models::json_boolean_optional_flag::JsonBooleanOptionalFlag;
use crate::models::json_flag::JsonFlag;
use crate::models::json_list_as_json_uncut_flag::JsonListAsJSONUncutFlag;
use crate::models::json_print_one_json_result_flag::JsonPrintOneJSONResultFlag;
use crate::models::lane_flag::LaneFlag;
use crate::models::lane_lane_name_required_flag::LaneLaneNameRequiredFlag;
use crate::models::lane_the_forked_lane_when_flag::LaneTheForkedLaneWhenFlag;
use crate::models::like_flag::LikeFlag;
use crate::models::limit_flag::LimitFlag;
use crate::models::limit_uint64_optional50_flag::LimitUint64Optional50Flag;
use crate::models::lines_flag::LinesFlag;
use crate::models::list_flag::ListFlag;
use crate::models::mail_dir_flag::MailDirFlag;
use crate::models::mail_dir_string_optional_flag::MailDirStringOptionalFlag;
use crate::models::merged_into_flag::MergedIntoFlag;
use crate::models::mode_flag::ModeFlag;
use crate::models::model_flag::ModelFlag;
use crate::models::mood_flag::MoodFlag;
use crate::models::no_header_flag::NoHeaderFlag;
use crate::models::no_post_pr_flag::NoPostPrFlag;
use crate::models::no_start_flag::NoStartFlag;
use crate::models::on_parent_death_flag::OnParentDeathFlag;
use crate::models::parent_flag::ParentFlag;
use crate::models::parent_the_lane_that_summoned_flag::ParentTheLaneThatSummonedFlag;
use crate::models::path_flag::PathFlag;
use crate::models::post_pr_flag::PostPrFlag;
use crate::models::pr_base_flag::PrBaseFlag;
use crate::models::preset_flag::PresetFlag;
use crate::models::reclaim_flag::ReclaimFlag;
use crate::models::resume_flag::ResumeFlag;
use crate::models::role_flag::RoleFlag;
use crate::models::route_only_flag::RouteOnlyFlag;
use crate::models::session_flag::SessionFlag;
use crate::models::session_id_flag::SessionIdFlag;
use crate::models::since_flag::SinceFlag;
use crate::models::since_string_optional_flag::SinceStringOptionalFlag;
use crate::models::socket_flag::SocketFlag;
use crate::models::socket_string_optional_flag::SocketStringOptionalFlag;
use crate::models::socket_tmux_socket_the_pane_flag::SocketTmuxSocketThePaneFlag;
use crate::models::socket_tmux_socket_to_spawn_flag::SocketTmuxSocketToSpawnFlag;
use crate::models::state_bulk_delete_dead_removes_flag::StateBulkDeleteDeadRemovesFlag;
use crate::models::state_flag::StateFlag;
use crate::models::timeout_flag::TimeoutFlag;
use crate::models::timeout_uint64_optional540_flag::TimeoutUint64Optional540Flag;
use crate::models::tmux_flag::TmuxFlag;
use crate::models::tmux_string_required_flag::TmuxStringRequiredFlag;
use crate::models::touched_flag::TouchedFlag;
use crate::models::trace_flag::TraceFlag;
use crate::models::turn_from_flag::TurnFromFlag;
use crate::models::turn_to_flag::TurnToFlag;
use crate::models::until_flag::UntilFlag;
use crate::models::values0::Values0;
use crate::models::values1::Values1;
use crate::models::values4::Values4;
use crate::models::values5::Values5;
use crate::models::values6::Values6;
use crate::models::values7::Values7;
use crate::models::values8::Values8;
use crate::models::variant_flag::VariantFlag;
use crate::models::variant_opencode_reasoning_effort_variant_flag::VariantOpencodeReasoningEffortVariantFlag;
use crate::models::verbose_flag::VerboseFlag;
use crate::models::verify_flag::VerifyFlag;
use crate::models::verify_validation_command_carried_from_flag::VerifyValidationCommandCarriedFromFlag;
use crate::models::wait_timeout_flag::WaitTimeoutFlag;
use crate::models::yes_flag::YesFlag;

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
  pub stateFlag: StateFlag,
  #[command(flatten)]
  pub harnessFlag: HarnessFlag,
  #[command(flatten)]
  pub allFlag: AllFlag,
  #[command(flatten)]
  pub jsonFlag: JsonFlag,
  #[command(flatten)]
  pub noHeaderFlag: NoHeaderFlag,
  #[command(flatten)]
  pub socketFlag: SocketFlag,
  #[command(flatten)]
  pub mailDirFlag: MailDirFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobResumeArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirFlag: MailDirFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobCreateArgs {
  #[command(flatten)]
  pub branchFlag: BranchFlag,
  #[command(flatten)]
  pub briefFlag: BriefFlag,
  #[command(flatten)]
  pub goalFlag: GoalFlag,
  #[command(flatten)]
  pub moodFlag: MoodFlag,
  #[command(flatten)]
  pub traceFlag: TraceFlag,
  #[command(flatten)]
  pub noStartFlag: NoStartFlag,
  #[command(flatten)]
  pub cwdFlag: CwdFlag,
  #[command(flatten)]
  pub baseShaFlag: BaseShaFlag,
  #[command(flatten)]
  pub expectPathFlag: ExpectPathFlag,
  #[command(flatten)]
  pub expectCommitSubjectFlag: ExpectCommitSubjectFlag,
  #[command(flatten)]
  pub expectCommitsAtLeastFlag: ExpectCommitsAtLeastFlag,
  #[command(flatten)]
  pub verifyFlag: VerifyFlag,
  #[command(flatten)]
  pub envFlag: EnvFlag,
  #[command(flatten)]
  pub commitPushFlag: CommitPushFlag,
  #[command(flatten)]
  pub postPrFlag: PostPrFlag,
  #[command(flatten)]
  pub noPostPrFlag: NoPostPrFlag,
  #[command(flatten)]
  pub prBaseFlag: PrBaseFlag,
  #[command(flatten)]
  pub parentFlag: ParentFlag,
  #[command(flatten)]
  pub onParentDeathFlag: OnParentDeathFlag,
  #[command(flatten)]
  pub presetFlag: PresetFlag,
  #[command(flatten)]
  pub variantFlag: VariantFlag,
  #[command(flatten)]
  pub binFlag: BinFlag,
  #[command(flatten)]
  pub waitTimeoutFlag: WaitTimeoutFlag,
  #[command(flatten)]
  pub timeoutFlag: TimeoutFlag,
  #[command(flatten)]
  pub laneFlag: LaneFlag,
  #[command(flatten)]
  pub tmuxFlag: TmuxFlag,
  #[command(flatten)]
  pub socketTmuxSocketToSpawnFlag: SocketTmuxSocketToSpawnFlag,
  #[command(flatten)]
  pub mailDirFlag: MailDirFlag,
  #[command(flatten)]
  pub dryRunFlag: DryRunFlag,
  #[command(flatten)]
  pub reclaimFlag: ReclaimFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobReviveArgs {
  #[doc = "The dead route to revive. Omit for `--dead` or `--list`"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[command(flatten)]
  pub deadFlag: DeadFlag,
  #[command(flatten)]
  pub listFlag: ListFlag,
  #[command(flatten)]
  pub jsonListAsJSONUncutFlag: JsonListAsJSONUncutFlag,
  #[command(flatten)]
  pub yesFlag: YesFlag,
  #[command(flatten)]
  pub sinceFlag: SinceFlag,
  #[command(flatten)]
  pub socketTmuxSocketThePaneFlag: SocketTmuxSocketThePaneFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobGetArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub touchedFlag: TouchedFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobWhereArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobPatchArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub tmuxStringRequiredFlag: TmuxStringRequiredFlag,
  #[command(flatten)]
  pub harnessStringOptionalFlag: HarnessStringOptionalFlag,
  #[command(flatten)]
  pub sessionIdFlag: SessionIdFlag,
  #[command(flatten)]
  pub cwdStringOptionalFlag: CwdStringOptionalFlag,
  #[command(flatten)]
  pub modelFlag: ModelFlag,
  #[command(flatten)]
  pub modeFlag: ModeFlag,
  #[command(flatten)]
  pub parentTheLaneThatSummonedFlag: ParentTheLaneThatSummonedFlag,
  #[command(flatten)]
  pub goalStringOptionalFlag: GoalStringOptionalFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobDeleteArgs {
  #[doc = "One lane: kill its pane and drop its route. Omit for a bulk delete by `--state`"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[command(flatten)]
  pub routeOnlyFlag: RouteOnlyFlag,
  #[command(flatten)]
  pub stateBulkDeleteDeadRemovesFlag: StateBulkDeleteDeadRemovesFlag,
  #[command(flatten)]
  pub dryRunPrintWhatASingleFlag: DryRunPrintWhatASingleFlag,
  #[command(flatten)]
  pub mergedIntoFlag: MergedIntoFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobRmArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobKillArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobWaitArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub timeoutUint64Optional540Flag: TimeoutUint64Optional540Flag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobAttachArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobSignalArgs {
  #[arg()]
  pub signal: String,
  #[command(flatten)]
  pub childrenFlag: ChildrenFlag,
  #[command(flatten)]
  pub asFlag: AsFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobPruneArgs {
  #[command(flatten)]
  pub dryRunPrintWhatWouldBeFlag: DryRunPrintWhatWouldBeFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobRouteArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobPaneArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub linesFlag: LinesFlag,
  #[command(flatten)]
  pub socketStringOptionalFlag: SocketStringOptionalFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobSquaresArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
  #[command(flatten)]
  pub socketStringOptionalFlag: SocketStringOptionalFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct JobMessageArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobMessageListArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirFlag: MailDirFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JobRunArgs {
  #[command(flatten)]
  pub laneLaneNameRequiredFlag: LaneLaneNameRequiredFlag,
  #[command(flatten)]
  pub harnessStringRequiredFlag: HarnessStringRequiredFlag,
  #[command(flatten)]
  pub briefAbsolutePathToTheFlag: BriefAbsolutePathToTheFlag,
  #[command(flatten)]
  pub modelFlag: ModelFlag,
  #[command(flatten)]
  pub effortFlag: EffortFlag,
  #[command(flatten)]
  pub resumeFlag: ResumeFlag,
  #[command(flatten)]
  pub variantOpencodeReasoningEffortVariantFlag: VariantOpencodeReasoningEffortVariantFlag,
  #[command(flatten)]
  pub binTheExecutableTheHarnessFlag: BinTheExecutableTheHarnessFlag,
  #[command(flatten)]
  pub verifyValidationCommandCarriedFromFlag: VerifyValidationCommandCarriedFromFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct MailArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct SendArgs {
  #[arg()]
  pub body: String,
  #[arg(long = "to")]
  pub job: String,
  #[command(flatten)]
  pub asFlag: AsFlag,
  #[arg(long, default_value = "request")]
  pub kind: String,
  #[command(flatten)]
  pub timeoutUint64Optional540Flag: TimeoutUint64Optional540Flag,
  #[arg(long)]
  pub no_wait: bool,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct RecvArgs {
  #[command(flatten)]
  pub asFlag: AsFlag,
  #[command(flatten)]
  pub hookFlag: HookFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MailWaitArgs {
  #[arg(value_name = "ID-OR-JOB")]
  pub id_or_job: Option<String>,
  #[arg(long)]
  pub me: bool,
  #[command(flatten)]
  pub asFlag: AsFlag,
  #[command(flatten)]
  pub timeoutUint64Optional540Flag: TimeoutUint64Optional540Flag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct WatchArgs {
  #[doc = "Directory containing ready `.md` files"]
  #[arg()]
  pub directory: String,
  #[doc = "Process one scan and exit; useful for supervised one-shot runs"]
  #[arg(long)]
  pub once: bool,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
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
pub struct AgentSummaryArgs {
  #[command(flatten)]
  pub formatTextJsonOptionalJsonFlag: FormatTextJsonOptionalJsonFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct SessionArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSessionListArgs {
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSessionGetArgs {
  #[arg()]
  pub session: String,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct TurnArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbTurnListArgs {
  #[command(flatten)]
  pub harnessStringOptionalFlag: HarnessStringOptionalFlag,
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub roleFlag: RoleFlag,
  #[command(flatten)]
  pub sinceStringOptionalFlag: SinceStringOptionalFlag,
  #[command(flatten)]
  pub untilFlag: UntilFlag,
  #[command(flatten)]
  pub turnFromFlag: TurnFromFlag,
  #[command(flatten)]
  pub turnToFlag: TurnToFlag,
  #[command(flatten)]
  pub pathFlag: PathFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbTurnGetArgs {
  #[arg()]
  pub session: String,
  #[arg()]
  pub turn: String,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct ChatArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbChatListArgs {
  #[command(flatten)]
  pub harnessStringOptionalFlag: HarnessStringOptionalFlag,
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub roleFlag: RoleFlag,
  #[command(flatten)]
  pub sinceStringOptionalFlag: SinceStringOptionalFlag,
  #[command(flatten)]
  pub untilFlag: UntilFlag,
  #[command(flatten)]
  pub turnFromFlag: TurnFromFlag,
  #[command(flatten)]
  pub turnToFlag: TurnToFlag,
  #[command(flatten)]
  pub pathFlag: PathFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
  #[arg(long)]
  pub all: bool,
  #[arg(long)]
  pub follow: bool,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct TouchArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbTouchListArgs {
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub sinceStringOptionalFlag: SinceStringOptionalFlag,
  #[command(flatten)]
  pub untilFlag: UntilFlag,
  #[command(flatten)]
  pub likeFlag: LikeFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct CommandArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbCommandListArgs {
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub sinceStringOptionalFlag: SinceStringOptionalFlag,
  #[command(flatten)]
  pub untilFlag: UntilFlag,
  #[command(flatten)]
  pub likeFlag: LikeFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct FetchArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbFetchListArgs {
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub sinceStringOptionalFlag: SinceStringOptionalFlag,
  #[command(flatten)]
  pub untilFlag: UntilFlag,
  #[command(flatten)]
  pub likeFlag: LikeFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct SkillArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSkillListArgs {
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub sinceStringOptionalFlag: SinceStringOptionalFlag,
  #[command(flatten)]
  pub untilFlag: UntilFlag,
  #[command(flatten)]
  pub likeFlag: LikeFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct PrArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbPrListArgs {
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub sinceStringOptionalFlag: SinceStringOptionalFlag,
  #[command(flatten)]
  pub untilFlag: UntilFlag,
  #[command(flatten)]
  pub likeFlag: LikeFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct SpanArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSpanListArgs {
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub sinceStringOptionalFlag: SinceStringOptionalFlag,
  #[command(flatten)]
  pub untilFlag: UntilFlag,
  #[command(flatten)]
  pub likeFlag: LikeFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct EdgeArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbEdgeListArgs {
  #[command(flatten)]
  pub sessionFlag: SessionFlag,
  #[command(flatten)]
  pub limitFlag: LimitFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct UsageArgs {
  #[command(flatten)]
  pub formatFlag: FormatFlag,
  #[doc = "Print this alias's SQL and exit"]
  #[arg(long)]
  pub show_sql: bool,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BlocksArgs {
  #[arg(long, default_value_t = 5)]
  pub window_hours: u64,
  #[doc = "Only the window that is still open"]
  #[arg(long)]
  pub active: bool,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BurnRateArgs {
  #[arg(long, default_value_t = 60)]
  pub window_minutes: u64,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct PriceArgs {}

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
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbFavoriteShowArgs {
  #[arg()]
  pub id: String,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct EditArgs {
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
pub struct SyncArgs {}

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
pub struct SyncCursorArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSyncCursorListArgs {
  #[command(flatten)]
  pub limitFlag: LimitFlag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSearchArgs {
  #[doc = "Text to find, case-insensitive"]
  #[arg()]
  pub text: String,
  #[command(flatten)]
  pub daysFlag: DaysFlag,
  #[command(flatten)]
  pub harnessOnlyThisHarnessClaudeFlag: HarnessOnlyThisHarnessClaudeFlag,
  #[doc = "Return only turns classified as direct human input"]
  #[arg(long)]
  pub human: bool,
  #[command(flatten)]
  pub limitUint64Optional50Flag: LimitUint64Optional50Flag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DbSessionsArgs {
  #[command(flatten)]
  pub daysFlag: DaysFlag,
  #[command(flatten)]
  pub harnessOnlyThisHarnessClaudeFlag: HarnessOnlyThisHarnessClaudeFlag,
  #[command(flatten)]
  pub limitUint64Optional50Flag: LimitUint64Optional50Flag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct LanesArgs {
  #[command(flatten)]
  pub daysFlag: DaysFlag,
  #[command(flatten)]
  pub limitUint64Optional50Flag: LimitUint64Optional50Flag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
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
  pub limitUint64Optional50Flag: LimitUint64Optional50Flag,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct SchemaArgs {
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct StatusArgs {
  #[doc = "Window in minutes"]
  #[arg(long, default_value_t = 10)]
  pub window: u64,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DebugArgs {
  #[doc = "One lane, answered in full: route, mail, worktree, transcript, alerts. Without it, the WARN/ERROR window across every lane"]
  #[arg(value_name = "LANE")]
  pub lane_arg: Option<String>,
  #[doc = "Window to read back, as `Ns`, `Nm`, `Nh` or a count of seconds"]
  #[arg(long, default_value = "2m")]
  pub since: String,
  #[doc = "One lane only, for the alert window"]
  #[arg(long, value_name = "LANE")]
  pub lane: Option<String>,
  #[doc = "One JSON document, `alerts` and `sync`, instead of the grouped text"]
  #[arg(long)]
  pub json: bool,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MeArgs {
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MeWhoamiArgs {
  #[command(flatten)]
  pub jsonBooleanOptionalFlag: JsonBooleanOptionalFlag,
  #[command(flatten)]
  pub asFlag: AsFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MeRegisterArgs {
  #[arg()]
  pub name: String,
  #[command(flatten)]
  pub harnessStringOptionalFlag: HarnessStringOptionalFlag,
  #[arg(long)]
  pub parent: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct MoodArgs {
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
pub struct PathArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct ConfigShowArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct PresetsArgs {
  #[arg(long, value_enum, default_value = "table")]
  pub format: Values4,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct AgentArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct SummaryArgs {
  #[command(flatten)]
  pub formatTextJsonOptionalJsonFlag: FormatTextJsonOptionalJsonFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
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
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
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
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
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
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepRemindListArgs {
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct CancelArgs {
  #[arg()]
  pub name: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepRemindRunArgs {
  #[arg(long)]
  pub once: bool,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct HarnessArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepHarnessListArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepHarnessGetArgs {
  #[arg()]
  pub harness: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct LaneArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneListArgs {
  #[command(flatten)]
  pub stateFlag: StateFlag,
  #[command(flatten)]
  pub harnessFlag: HarnessFlag,
  #[command(flatten)]
  pub allFlag: AllFlag,
  #[command(flatten)]
  pub jsonFlag: JsonFlag,
  #[command(flatten)]
  pub noHeaderFlag: NoHeaderFlag,
  #[command(flatten)]
  pub socketFlag: SocketFlag,
  #[command(flatten)]
  pub mailDirFlag: MailDirFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneResumeArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirFlag: MailDirFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneCreateArgs {
  #[command(flatten)]
  pub branchFlag: BranchFlag,
  #[command(flatten)]
  pub briefFlag: BriefFlag,
  #[command(flatten)]
  pub goalFlag: GoalFlag,
  #[command(flatten)]
  pub moodFlag: MoodFlag,
  #[command(flatten)]
  pub traceFlag: TraceFlag,
  #[command(flatten)]
  pub noStartFlag: NoStartFlag,
  #[command(flatten)]
  pub cwdFlag: CwdFlag,
  #[command(flatten)]
  pub baseShaFlag: BaseShaFlag,
  #[command(flatten)]
  pub expectPathFlag: ExpectPathFlag,
  #[command(flatten)]
  pub expectCommitSubjectFlag: ExpectCommitSubjectFlag,
  #[command(flatten)]
  pub expectCommitsAtLeastFlag: ExpectCommitsAtLeastFlag,
  #[command(flatten)]
  pub verifyFlag: VerifyFlag,
  #[command(flatten)]
  pub envFlag: EnvFlag,
  #[command(flatten)]
  pub commitPushFlag: CommitPushFlag,
  #[command(flatten)]
  pub postPrFlag: PostPrFlag,
  #[command(flatten)]
  pub noPostPrFlag: NoPostPrFlag,
  #[command(flatten)]
  pub prBaseFlag: PrBaseFlag,
  #[command(flatten)]
  pub parentFlag: ParentFlag,
  #[command(flatten)]
  pub onParentDeathFlag: OnParentDeathFlag,
  #[command(flatten)]
  pub presetFlag: PresetFlag,
  #[command(flatten)]
  pub variantFlag: VariantFlag,
  #[command(flatten)]
  pub binFlag: BinFlag,
  #[command(flatten)]
  pub waitTimeoutFlag: WaitTimeoutFlag,
  #[command(flatten)]
  pub timeoutFlag: TimeoutFlag,
  #[command(flatten)]
  pub laneFlag: LaneFlag,
  #[command(flatten)]
  pub tmuxFlag: TmuxFlag,
  #[command(flatten)]
  pub socketTmuxSocketToSpawnFlag: SocketTmuxSocketToSpawnFlag,
  #[command(flatten)]
  pub mailDirFlag: MailDirFlag,
  #[command(flatten)]
  pub dryRunFlag: DryRunFlag,
  #[command(flatten)]
  pub reclaimFlag: ReclaimFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneReviveArgs {
  #[doc = "The dead route to revive. Omit for `--dead` or `--list`"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[command(flatten)]
  pub deadFlag: DeadFlag,
  #[command(flatten)]
  pub listFlag: ListFlag,
  #[command(flatten)]
  pub jsonListAsJSONUncutFlag: JsonListAsJSONUncutFlag,
  #[command(flatten)]
  pub yesFlag: YesFlag,
  #[command(flatten)]
  pub sinceFlag: SinceFlag,
  #[command(flatten)]
  pub socketTmuxSocketThePaneFlag: SocketTmuxSocketThePaneFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneGetArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub touchedFlag: TouchedFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneWhereArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLanePatchArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub tmuxStringRequiredFlag: TmuxStringRequiredFlag,
  #[command(flatten)]
  pub harnessStringOptionalFlag: HarnessStringOptionalFlag,
  #[command(flatten)]
  pub sessionIdFlag: SessionIdFlag,
  #[command(flatten)]
  pub cwdStringOptionalFlag: CwdStringOptionalFlag,
  #[command(flatten)]
  pub modelFlag: ModelFlag,
  #[command(flatten)]
  pub modeFlag: ModeFlag,
  #[command(flatten)]
  pub parentTheLaneThatSummonedFlag: ParentTheLaneThatSummonedFlag,
  #[command(flatten)]
  pub goalStringOptionalFlag: GoalStringOptionalFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneDeleteArgs {
  #[doc = "One lane: kill its pane and drop its route. Omit for a bulk delete by `--state`"]
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[command(flatten)]
  pub routeOnlyFlag: RouteOnlyFlag,
  #[command(flatten)]
  pub stateBulkDeleteDeadRemovesFlag: StateBulkDeleteDeadRemovesFlag,
  #[command(flatten)]
  pub dryRunPrintWhatASingleFlag: DryRunPrintWhatASingleFlag,
  #[command(flatten)]
  pub mergedIntoFlag: MergedIntoFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneRmArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneKillArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneWaitArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub timeoutUint64Optional540Flag: TimeoutUint64Optional540Flag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneAttachArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneSignalArgs {
  #[arg()]
  pub signal: String,
  #[command(flatten)]
  pub childrenFlag: ChildrenFlag,
  #[command(flatten)]
  pub asFlag: AsFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLanePruneArgs {
  #[command(flatten)]
  pub dryRunPrintWhatWouldBeFlag: DryRunPrintWhatWouldBeFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneRouteArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLanePaneArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub linesFlag: LinesFlag,
  #[command(flatten)]
  pub socketStringOptionalFlag: SocketStringOptionalFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneSquaresArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub formatFlag: FormatFlag,
  #[command(flatten)]
  pub socketStringOptionalFlag: SocketStringOptionalFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepLaneMessageArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneMessageListArgs {
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub mailDirFlag: MailDirFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct BeepLaneRunArgs {
  #[command(flatten)]
  pub laneLaneNameRequiredFlag: LaneLaneNameRequiredFlag,
  #[command(flatten)]
  pub harnessStringRequiredFlag: HarnessStringRequiredFlag,
  #[command(flatten)]
  pub briefAbsolutePathToTheFlag: BriefAbsolutePathToTheFlag,
  #[command(flatten)]
  pub modelFlag: ModelFlag,
  #[command(flatten)]
  pub effortFlag: EffortFlag,
  #[command(flatten)]
  pub resumeFlag: ResumeFlag,
  #[command(flatten)]
  pub variantOpencodeReasoningEffortVariantFlag: VariantOpencodeReasoningEffortVariantFlag,
  #[command(flatten)]
  pub binTheExecutableTheHarnessFlag: BinTheExecutableTheHarnessFlag,
  #[command(flatten)]
  pub verifyValidationCommandCarriedFromFlag: VerifyValidationCommandCarriedFromFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepAgentArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct WaterfallArgs {
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
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DoneArgs {
  #[arg()]
  pub name: String,
  #[arg(long, default_value_t = 0)]
  pub rc: u64,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct SubscribeArgs {
  #[doc = "A lane, or the `children` / `'*'` alias"]
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[doc = "How a commit reaches the subscriber: `door` or `mailbox`"]
  #[arg(long, default_value = "door")]
  pub mode: String,
  #[command(flatten)]
  pub asTheSubscriberDefaultsToFlag: AsTheSubscriberDefaultsToFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct UnsubscribeArgs {
  #[doc = "A lane, or the `children` / `'*'` alias"]
  #[arg(value_name = "LANE")]
  pub lane: String,
  #[command(flatten)]
  pub asTheSubscriberDefaultsToFlag: AsTheSubscriberDefaultsToFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct BeepMessageArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct AckArgs {
  #[arg(long, value_name = "LANE")]
  pub lane: Option<String>,
  #[arg(long)]
  pub r#box: Option<String>,
  #[arg(long)]
  pub close_routeless: bool,
  #[arg(long, default_value_t = 7)]
  pub max_age_days: u64,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct ForkArgs {
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
  pub parentFlag: ParentFlag,
  #[doc = "Print the brief path and the lane's `cmd:` line without spawning"]
  #[arg(long)]
  pub dry_run: bool,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct JoinArgs {
  #[doc = "`comment_id` in `agent_turn_comment`"]
  #[arg()]
  pub comment: String,
  #[command(flatten)]
  pub laneTheForkedLaneWhenFlag: LaneTheForkedLaneWhenFlag,
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
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DiffArgs {
  #[doc = "`comment_id` in `agent_turn_comment`"]
  #[arg()]
  pub comment: String,
  #[command(flatten)]
  pub laneTheForkedLaneWhenFlag: LaneTheForkedLaneWhenFlag,
  #[doc = "Print `--stat` instead of the full diff"]
  #[arg(long)]
  pub stat: bool,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct PasteArgs {
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
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct PsArgs {
  #[arg(value_name = "LANE")]
  pub lane: Option<String>,
  #[doc = "Include dead routes (no live process behind the pane)"]
  #[arg(long)]
  pub all: bool,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct PstreeArgs {
  #[doc = "Include dead lanes; default is live-only"]
  #[arg(long)]
  pub all: bool,
  #[arg(long, value_enum, default_value = "text")]
  pub format: Values7,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct SelectionArgs {
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
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
pub struct FocusArgs {
  #[arg()]
  pub target: String,
  #[arg(long)]
  pub at: Option<String>,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct ClearArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct ShoutArgs {
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
  pub asWhoTheRowsAreFlag: AsWhoTheRowsAreFlag,
  #[doc = "The mail kind the rows wear"]
  #[arg(long, default_value = "hail")]
  pub kind: String,
  #[command(flatten)]
  pub verboseFlag: VerboseFlag,
  #[command(flatten)]
  pub jsonPrintOneJSONResultFlag: JsonPrintOneJSONResultFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct ScreamArgs {
  #[doc = "The message; omitted sends \"stop what ur doing check ps\""]
  #[arg()]
  pub body: Option<String>,
  #[command(flatten)]
  pub asWhoTheRowsAreFlag: AsWhoTheRowsAreFlag,
  #[command(flatten)]
  pub verboseFlag: VerboseFlag,
  #[command(flatten)]
  pub jsonPrintOneJSONResultFlag: JsonPrintOneJSONResultFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize, Default)]
pub struct InboxArgs {}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct DrainArgs {
  #[doc = "Whose inbox to drain; defaults to the identity ladder's answer"]
  #[arg(long = "as")]
  pub name: Option<String>,
  #[command(flatten)]
  pub hookFlag: HookFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct HooksArgs {
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
pub struct RecentArgs {
  #[arg(long, default_value_t = 5, short = 'n')]
  pub limit: u64,
  #[command(flatten)]
  pub formatTextJsonOptionalTextFlag: FormatTextJsonOptionalTextFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagSearchArgs {
  #[arg()]
  pub query: String,
  #[arg(long, default_value_t = 20, short = 'n')]
  pub limit: u64,
  #[command(flatten)]
  pub formatTextJsonOptionalTextFlag: FormatTextJsonOptionalTextFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct TagListArgs {
  #[command(flatten)]
  pub formatTextJsonOptionalTextFlag: FormatTextJsonOptionalTextFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct OfArgs {
  #[arg()]
  pub source: String,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct ForArgs {
  #[arg(required = true)]
  pub source: Vec<String>,
  #[command(flatten)]
  pub formatTextJsonOptionalTextFlag: FormatTextJsonOptionalTextFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct SourcesArgs {
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
pub struct BackfillArgs {}

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
  pub cwdStringOptionalFlag: CwdStringOptionalFlag,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
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
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}

#[derive(clap::Args, Debug, Clone, serde::Serialize)]
pub struct WhoamiArgs {
  #[command(flatten)]
  pub jsonBooleanOptionalFlag: JsonBooleanOptionalFlag,
  #[doc = "Who is calling. The first rung; `--from` is the same flag"]
  #[arg(long = "as")]
  pub name: Option<String>,
  #[command(flatten)]
  pub mailDirStringOptionalFlag: MailDirStringOptionalFlag,
}
