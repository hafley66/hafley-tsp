use crate::ops_auto::AgentArgs;
use crate::ops_auto::AgentSessionsArgs;
use crate::ops_auto::SummaryArgs;
use crate::ops_auto::BeepAgentArgs;
use crate::ops_auto::DoneArgs;
use crate::ops_auto::BeepAgentRegisterArgs;
use crate::ops_auto::SubscribeArgs;
use crate::ops_auto::UnsubscribeArgs;
use crate::ops_auto::WaterfallArgs;
use crate::ops_auto::BeepArgs;
use crate::ops_auto::ForkArgs;
use crate::ops_auto::DiffArgs;
use crate::ops_auto::JoinArgs;
use crate::ops_auto::HarnessArgs;
use crate::ops_auto::BeepHarnessGetArgs;
use crate::ops_auto::BeepHarnessListArgs;
use crate::ops_auto::LaneArgs;
use crate::ops_auto::BeepLaneAttachArgs;
use crate::ops_auto::BeepLaneCreateArgs;
use crate::ops_auto::BeepLaneDeleteArgs;
use crate::ops_auto::BeepLaneGetArgs;
use crate::ops_auto::BeepLaneKillArgs;
use crate::ops_auto::BeepLaneListArgs;
use crate::ops_auto::BeepLaneMessageArgs;
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
use crate::ops_auto::AckArgs;
use crate::ops_auto::BeepMessageArgs;
use crate::ops_auto::PasteArgs;
use crate::ops_auto::PsArgs;
use crate::ops_auto::PstreeArgs;
use crate::ops_auto::BeepRemindAddArgs;
use crate::ops_auto::BeepRemindArgs;
use crate::ops_auto::CancelArgs;
use crate::ops_auto::BeepRemindListArgs;
use crate::ops_auto::BeepRemindRunArgs;
use crate::ops_auto::ScreamArgs;
use crate::ops_auto::SelectionArgs;
use crate::ops_auto::ClearArgs;
use crate::ops_auto::FocusArgs;
use crate::ops_auto::BeepSelectionListArgs;
use crate::ops_auto::BeepSelectionSetArgs;
use crate::ops_auto::ShoutArgs;
use crate::ops_auto::ConfigArgs;
use crate::ops_auto::PathArgs;
use crate::ops_auto::PresetsArgs;
use crate::ops_auto::ConfigShowArgs;
use crate::ops_auto::AgentSummaryArgs;
use crate::ops_auto::DbArgs;
use crate::ops_auto::ChatArgs;
use crate::ops_auto::DbChatListArgs;
use crate::ops_auto::CommandArgs;
use crate::ops_auto::DbCommandListArgs;
use crate::ops_auto::EdgeArgs;
use crate::ops_auto::DbEdgeListArgs;
use crate::ops_auto::DbFavoriteAddArgs;
use crate::ops_auto::DbFavoriteArgs;
use crate::ops_auto::DbFavoriteDeleteArgs;
use crate::ops_auto::EditArgs;
use crate::ops_auto::DbFavoriteListArgs;
use crate::ops_auto::DbFavoriteShowArgs;
use crate::ops_auto::FetchArgs;
use crate::ops_auto::DbFetchListArgs;
use crate::ops_auto::LanesArgs;
use crate::ops_auto::DbMailArgs;
use crate::ops_auto::PrArgs;
use crate::ops_auto::DbPrListArgs;
use crate::ops_auto::PriceArgs;
use crate::ops_auto::DbPriceListArgs;
use crate::ops_auto::DbPriceSetArgs;
use crate::ops_auto::SchemaArgs;
use crate::ops_auto::DbSearchArgs;
use crate::ops_auto::SessionArgs;
use crate::ops_auto::DbSessionGetArgs;
use crate::ops_auto::DbSessionListArgs;
use crate::ops_auto::DbSessionsArgs;
use crate::ops_auto::SkillArgs;
use crate::ops_auto::DbSkillListArgs;
use crate::ops_auto::SpanArgs;
use crate::ops_auto::DbSpanListArgs;
use crate::ops_auto::StatusArgs;
use crate::ops_auto::SyncArgs;
use crate::ops_auto::DbSyncCreateArgs;
use crate::ops_auto::SyncCursorArgs;
use crate::ops_auto::DbSyncCursorListArgs;
use crate::ops_auto::TouchArgs;
use crate::ops_auto::DbTouchListArgs;
use crate::ops_auto::TurnArgs;
use crate::ops_auto::DbTurnGetArgs;
use crate::ops_auto::DbTurnListArgs;
use crate::ops_auto::UsageArgs;
use crate::ops_auto::BlocksArgs;
use crate::ops_auto::BurnRateArgs;
use crate::ops_auto::DebugArgs;
use crate::ops_auto::InboxArgs;
use crate::ops_auto::DrainArgs;
use crate::ops_auto::HooksArgs;
use crate::ops_auto::JobArgs;
use crate::ops_auto::JobAttachArgs;
use crate::ops_auto::JobCreateArgs;
use crate::ops_auto::JobDeleteArgs;
use crate::ops_auto::JobGetArgs;
use crate::ops_auto::JobKillArgs;
use crate::ops_auto::JobListArgs;
use crate::ops_auto::JobMessageArgs;
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
use crate::ops_auto::MailArgs;
use crate::ops_auto::RecvArgs;
use crate::ops_auto::SendArgs;
use crate::ops_auto::MailWaitArgs;
use crate::ops_auto::WatchArgs;
use crate::ops_auto::MeArgs;
use crate::ops_auto::MeFavoriteArgs;
use crate::ops_auto::MoodArgs;
use crate::ops_auto::MeRegisterArgs;
use crate::ops_auto::MeWhoamiArgs;
use crate::ops_auto::OpResult;
use crate::ops_auto::RemindArgs;
use crate::ops_auto::RootArgs;
use crate::ops_auto::ShellInitArgs;
use crate::ops_auto::TagAddArgs;
use crate::ops_auto::TagArgs;
use crate::ops_auto::BackfillArgs;
use crate::ops_auto::ForArgs;
use crate::ops_auto::TagListArgs;
use crate::ops_auto::OfArgs;
use crate::ops_auto::RecentArgs;
use crate::ops_auto::TagRmArgs;
use crate::ops_auto::TagSearchArgs;
use crate::ops_auto::SourcesArgs;
use crate::ops_auto::TuiArgs;
use crate::ops_auto::WaitArgs;
use crate::ops_auto::WhoamiArgs;

pub fn root(args: &RootArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job(args: &JobArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_list(args: &JobListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_resume(args: &JobResumeArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_create(args: &JobCreateArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_revive(args: &JobReviveArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_get(args: &JobGetArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_where(args: &JobWhereArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_patch(args: &JobPatchArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_delete(args: &JobDeleteArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_rm(args: &JobRmArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_kill(args: &JobKillArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_wait(args: &JobWaitArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_attach(args: &JobAttachArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_signal(args: &JobSignalArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_prune(args: &JobPruneArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_route(args: &JobRouteArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_pane(args: &JobPaneArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_squares(args: &JobSquaresArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_message(args: &JobMessageArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_message_list(args: &JobMessageListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn job_run(args: &JobRunArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn mail(args: &MailArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn send(args: &SendArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn recv(args: &RecvArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn mail_wait(args: &MailWaitArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn watch(args: &WatchArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db(args: &DbArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn agent_summary(args: &AgentSummaryArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn session(args: &SessionArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_session_list(args: &DbSessionListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_session_get(args: &DbSessionGetArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn turn(args: &TurnArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_turn_list(args: &DbTurnListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_turn_get(args: &DbTurnGetArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn chat(args: &ChatArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_chat_list(args: &DbChatListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn touch(args: &TouchArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_touch_list(args: &DbTouchListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn command(args: &CommandArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_command_list(args: &DbCommandListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn fetch(args: &FetchArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_fetch_list(args: &DbFetchListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn skill(args: &SkillArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_skill_list(args: &DbSkillListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn pr(args: &PrArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_pr_list(args: &DbPrListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn span(args: &SpanArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_span_list(args: &DbSpanListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn edge(args: &EdgeArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_edge_list(args: &DbEdgeListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn usage(args: &UsageArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn blocks(args: &BlocksArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn burn_rate(args: &BurnRateArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn price(args: &PriceArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_price_list(args: &DbPriceListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_price_set(args: &DbPriceSetArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_favorite(args: &DbFavoriteArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_favorite_add(args: &DbFavoriteAddArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_favorite_list(args: &DbFavoriteListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_favorite_show(args: &DbFavoriteShowArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn edit(args: &EditArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_favorite_delete(args: &DbFavoriteDeleteArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn sync(args: &SyncArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_sync_create(args: &DbSyncCreateArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn sync_cursor(args: &SyncCursorArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_sync_cursor_list(args: &DbSyncCursorListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_search(args: &DbSearchArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_sessions(args: &DbSessionsArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn lanes(args: &LanesArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn db_mail(args: &DbMailArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn schema(args: &SchemaArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn status(args: &StatusArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn debug(args: &DebugArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn me(args: &MeArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn me_whoami(args: &MeWhoamiArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn me_register(args: &MeRegisterArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn mood(args: &MoodArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn me_favorite(args: &MeFavoriteArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn config(args: &ConfigArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn path(args: &PathArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn config_show(args: &ConfigShowArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn presets(args: &PresetsArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn agent(args: &AgentArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn summary(args: &SummaryArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn agent_sessions(args: &AgentSessionsArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep(args: &BeepArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_remind(args: &BeepRemindArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_remind_add(args: &BeepRemindAddArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_remind_list(args: &BeepRemindListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn cancel(args: &CancelArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_remind_run(args: &BeepRemindRunArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn harness(args: &HarnessArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_harness_list(args: &BeepHarnessListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_harness_get(args: &BeepHarnessGetArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn lane(args: &LaneArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_list(args: &BeepLaneListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_resume(args: &BeepLaneResumeArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_create(args: &BeepLaneCreateArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_revive(args: &BeepLaneReviveArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_get(args: &BeepLaneGetArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_where(args: &BeepLaneWhereArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_patch(args: &BeepLanePatchArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_delete(args: &BeepLaneDeleteArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_rm(args: &BeepLaneRmArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_kill(args: &BeepLaneKillArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_wait(args: &BeepLaneWaitArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_attach(args: &BeepLaneAttachArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_signal(args: &BeepLaneSignalArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_prune(args: &BeepLanePruneArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_route(args: &BeepLaneRouteArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_pane(args: &BeepLanePaneArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_squares(args: &BeepLaneSquaresArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_message(args: &BeepLaneMessageArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_message_list(args: &BeepLaneMessageListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_lane_run(args: &BeepLaneRunArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_agent(args: &BeepAgentArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn waterfall(args: &WaterfallArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_agent_register(args: &BeepAgentRegisterArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn done(args: &DoneArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn subscribe(args: &SubscribeArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn unsubscribe(args: &UnsubscribeArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_message(args: &BeepMessageArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn ack(args: &AckArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn fork(args: &ForkArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn join(args: &JoinArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn diff(args: &DiffArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn paste(args: &PasteArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn ps(args: &PsArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn pstree(args: &PstreeArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn selection(args: &SelectionArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_selection_list(args: &BeepSelectionListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn beep_selection_set(args: &BeepSelectionSetArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn focus(args: &FocusArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn clear(args: &ClearArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn shout(args: &ShoutArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn scream(args: &ScreamArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn inbox(args: &InboxArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn drain(args: &DrainArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn hooks(args: &HooksArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn remind(args: &RemindArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn shell_init(args: &ShellInitArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn tag(args: &TagArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn tag_add(args: &TagAddArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn recent(args: &RecentArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn tag_search(args: &TagSearchArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn tag_list(args: &TagListArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn of(args: &OfArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn r#for(args: &ForArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn sources(args: &SourcesArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn tag_rm(args: &TagRmArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn backfill(args: &BackfillArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn tui(args: &TuiArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn wait(args: &WaitArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}

pub fn whoami(args: &WhoamiArgs) -> OpResult<()> {
  let _ = args;
  todo!()
}
