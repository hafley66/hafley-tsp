use std::io::BufRead;
use std::io::Write;

use crate::ops_auto::AckArgs;
use crate::ops_auto::AgentSessionsArgs;
use crate::ops_auto::AgentSummaryArgs;
use crate::ops_auto::BeepAgentRegisterArgs;
use crate::ops_auto::BeepArgs;
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
use crate::ops_auto::BeepRemindAddArgs;
use crate::ops_auto::BeepRemindListArgs;
use crate::ops_auto::BeepRemindRunArgs;
use crate::ops_auto::BeepSelectionSetArgs;
use crate::ops_auto::BlocksArgs;
use crate::ops_auto::BurnRateArgs;
use crate::ops_auto::CancelArgs;
use crate::ops_auto::DbArgs;
use crate::ops_auto::DbChatListArgs;
use crate::ops_auto::DbCommandListArgs;
use crate::ops_auto::DbEdgeListArgs;
use crate::ops_auto::DbFavoriteAddArgs;
use crate::ops_auto::DbFavoriteDeleteArgs;
use crate::ops_auto::DbFavoriteListArgs;
use crate::ops_auto::DbFavoriteShowArgs;
use crate::ops_auto::DbFetchListArgs;
use crate::ops_auto::DbMailArgs;
use crate::ops_auto::DbPrListArgs;
use crate::ops_auto::DbPriceSetArgs;
use crate::ops_auto::DbSearchArgs;
use crate::ops_auto::DbSessionGetArgs;
use crate::ops_auto::DbSessionListArgs;
use crate::ops_auto::DbSessionsArgs;
use crate::ops_auto::DbSkillListArgs;
use crate::ops_auto::DbSpanListArgs;
use crate::ops_auto::DbSyncCreateArgs;
use crate::ops_auto::DbSyncCursorListArgs;
use crate::ops_auto::DbTouchListArgs;
use crate::ops_auto::DbTurnGetArgs;
use crate::ops_auto::DbTurnListArgs;
use crate::ops_auto::DebugArgs;
use crate::ops_auto::DiffArgs;
use crate::ops_auto::DoneArgs;
use crate::ops_auto::DrainArgs;
use crate::ops_auto::EditArgs;
use crate::ops_auto::FocusArgs;
use crate::ops_auto::ForArgs;
use crate::ops_auto::ForkArgs;
use crate::ops_auto::HooksArgs;
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
use crate::ops_auto::JoinArgs;
use crate::ops_auto::LanesArgs;
use crate::ops_auto::MailWaitArgs;
use crate::ops_auto::MeArgs;
use crate::ops_auto::MeFavoriteArgs;
use crate::ops_auto::MeRegisterArgs;
use crate::ops_auto::MeWhoamiArgs;
use crate::ops_auto::MoodArgs;
use crate::ops_auto::OfArgs;
use crate::ops_auto::OpResult;
use crate::ops_auto::PasteArgs;
use crate::ops_auto::PresetsArgs;
use crate::ops_auto::PsArgs;
use crate::ops_auto::PstreeArgs;
use crate::ops_auto::RecentArgs;
use crate::ops_auto::RecvArgs;
use crate::ops_auto::RemindArgs;
use crate::ops_auto::RootArgs;
use crate::ops_auto::SchemaArgs;
use crate::ops_auto::ScreamArgs;
use crate::ops_auto::SelectionArgs;
use crate::ops_auto::SendArgs;
use crate::ops_auto::ShellInitArgs;
use crate::ops_auto::ShoutArgs;
use crate::ops_auto::SourcesArgs;
use crate::ops_auto::StatusArgs;
use crate::ops_auto::SubscribeArgs;
use crate::ops_auto::SummaryArgs;
use crate::ops_auto::TagAddArgs;
use crate::ops_auto::TagListArgs;
use crate::ops_auto::TagRmArgs;
use crate::ops_auto::TagSearchArgs;
use crate::ops_auto::TuiArgs;
use crate::ops_auto::UnsubscribeArgs;
use crate::ops_auto::UsageArgs;
use crate::ops_auto::WaitArgs;
use crate::ops_auto::WatchArgs;
use crate::ops_auto::WaterfallArgs;
use crate::ops_auto::WhoamiArgs;

#[derive(clap::Parser, Debug)]
#[command(name = "boop", version, about = "Cross-harness agent transcript reader: drive jobs with `job`, read what agents did with `db`", after_help = "DOCTRINE (this help is the usage contract; agents read it with `boop --help`):\n\nCOORDINATOR: `boop --preset codex` opens a named persistent ACPX session and\n  registers it as `coordinator`. Standard input is one prompt per line. Worker\n  hails enter the same ACPX queue with `--no-wait`; successful queue admission\n  stamps the mailbox row. A configured model preset such as `terra` may replace\n  the direct agent name. `BOOP_ACPX_BIN` selects an installed acpx executable;\n  absent that, Boop runs the pinned published ACPX package.\n\nWARMUP: after the worktree exists and before the agent starts, lane create runs\n  the repo's `boop-start` just recipe if it declares one, and a repo that does\n  not is skipped in silence. A FAILING recipe blocks the spawn: the pre-commit\n  hook needs what it installs, and a lane that cannot commit reads the abort as\n  success. `--no-start` opts out.\n\nREGISTER: one path per kind of caller. A pane registers itself by running a\n  harness TUI through Boop; a pane-less agent (a coordinator with no tmux\n  session, or a native subagent) registers by name:\n    boop tui <harness> [--cwd <dir>] [--name <id>]      interactive pane\n    boop me register <name> [--parent <id>]            pane-less route\n\nSPAWN: every lane spawn goes through lane create; bare tmux spawns leave no\nedge and stay invisible to tracking:\n    boop job create --branch feature/<name> --brief <abs-path> \\\n      --preset <p> [--goal <text>] [--wait] [--mail-dir <d>] [--dry-run]\n  ONE derivation, from the whole branch name: `feature/schema-emit` gives lane\n  id and tmux session `feature-schema-emit` (`/` spelled `-`, the one character\n  tmux cannot hold) and worktree `.boop-worktrees/feature/schema-emit` (the same\n  name as a path). No prefix is dropped and no `lane/` prefix is added.\n  Kinds are feature/fix/refactor/chore, a convention the CLI prints, not a gate.\n  REPO: --cwd wins; without it the repo holding --brief wins (and prints\n  `repo: <toplevel> (from the brief; caller stands in <other>)` when your shell\n  stands elsewhere); only a brief outside any repo falls back to your own cwd.\n  A dead name resets itself: `lane create` on a name whose worktree, branch or\n  tmux session is left over removes all three and the conversation pin before\n  spawning; a live pane refuses and names the hail instead. --reclaim is a\n  no-op alias now.\n  --base-sha defaults to origin/main's head\n  (resolved at spawn and printed), --parent to you then to the one registered\n  coordinator; the harness is the preset's.\n  Overrides: --lane <id>, --tmux <name>, --base-sha <sha>.\n  Model preset: --preset flash4 resolves through the platform config directory's\n  boop/config.json; `boop config presets` lists every name with its model, bin\n  and harness, and `--format json` prints the rows machine-shaped.\n  Alternate binary: --bin ccz runs the harness as that executable instead of its\n  own (ccz is claude under the z.ai env); a preset's `bin` key sets it per name.\n  Completion assertions: --expect-path <rel> (repeatable) names a worktree file\n  that must exist; --expect-commit-subject <text> (repeatable) an exact commit\n  subject after base-sha; --expect-commits-at-least <n> a floor on those commits.\n  One shot: worktree at base sha + spawn + route registration.\n  Always --dry-run first; the printed `cmd:` line is the literal spawn.\n\nCOMPLETION: the supervisor writes ONE row `lane <id> done rc=<n>` into the\n  parent's mailbox on every exit path, including a signalled pane; the pane's\n  own epilogue only drops the lane's route.\n  A lane spawned with --parent reports completion; do not poll.\n  A parent whose route is kind=coordinator (what `boop tui <harness>` writes)\n  gets that hail through its harness door as its next prompt; no wait needs\n  arming.\n  `--wait` blocks on that row and exits with the lane's rc, so spawn-and-join is\n  one command; `--wait-timeout <s>` (default 3600, 0 waits forever) exits 124.\n  The same wait after the fact is the one wait verb, given the lane's name:\n    boop job wait <lane> [--timeout <s>]\n  A wait whose lane route goes dead with no row exits 3 instead of blocking.\n\nCOMMIT PUSH: a lane reports by committing; its parent watches HEAD. Every\n  commit carries trailers, one per line after the subject:\n    git commit -m \"area: what changed\" -m \"Boop-Status: wip\"\n  Boop-Status  wip (the default checkpoint), done, or blocked\n  Boop-Ask     the one question, required on a blocked commit\n  Boop-Check   an optional validation receipt, `<command> -> <result>`\n  A blocked commit mints a request and takes the door, ending a\n  `boop job wait <lane>`; a done commit stays in the mailbox and the result row\n  carries the head. The parent watches the worktree reflog (its mtime plus the\n  git-write tool-call nudge); BOOP_COMMIT_QUIET_SECS (default 3) coalesces a\n  burst into one row `old..new n=<count>`, and one push per commit goes to each\n  subscriber. The body names the range:\n    git -C <worktree> log -p old..new\n  A wip commit takes the door for subscribed routes: the parent by default,\n  door for coordinator/native/acpx parents and mailbox for lane parents. Change\n  it per lane or per edge:\n    boop beep agent subscribe <lane|children|*> [--mode door|mailbox] [--as <me>]\n    boop beep agent unsubscribe <lane|children|*> [--as <me>]\n  `children` writes one row per current child plus a wildcard row. At spawn:\n    boop job create --branch feature/<name> --brief <abs-path> \\\n      --preset <p> --commit-push mailbox\n  Absent a row the parent's kind picks the default.\n\nPR PUSH: a lane can finish by opening a PR; any PR a lane or a coordinator\n  opens is pushed once to the route's subscribers.\n    boop job create --branch feature/<name> --brief <abs-path> \\\n      --post-pr [--pr-base <branch>]\n  Config `post-pr` (global or per preset) is the default; `--no-post-pr`\n  overrides it. The supervisor's `gh pr create` and transcript ingest both\n  notify; one `agent_pr_notice` row per url keeps them to one notice.\n\nRETIRE + REVIVE: a lane whose result row is written and then sees no mail for\n  BOOP_IDLE_SHUTDOWN_SECS (default 60; 0 disables) closes its harness and\n  exits with the rc it already mailed; residency reads `retired` and the\n  parent gets one `note` row. Nothing is lost: the conversation id is pinned\n  in ~/.agent/lanes/<lane>/conversation and the exact spawn in spawn.json.\n    boop mail send --to <lane> <body>\n  to a retired lane replays that spawn, re-registers the route, resumes the\n  pinned conversation, waits up to 60 s for the supervisor to report live,\n  and hands it the body as its opening turn. The send's wait then ends on the\n  lane's next yield or result row, the same rows its parent reads.\n  A coordinator pane (`boop tui <harness>`) killed without `/exit` (tmux server\n  death, SIGKILL, sleep) comes back on the conversation its route already holds.\n  After a tmux server death this is the one command to type:\n    boop job revive --dead [--since 1h] [--yes] [--socket <s>]\n    boop job revive --list [--json]      look, do not spawn\n    boop job revive <name>               one route by name\n  The precondition is THREE route fields: harness, session_id and cwd. A dead\n  coordinator row carrying all three prints REVIVABLE in `lane list`; one\n  missing a field is named and skipped by --dead. --dead offers kind=coordinator\n  routes only (a revived coordinator revives its own lanes), active within\n  --since. Registered sessions remain eligible before transcript sync. Live\n  wrapper ownership excludes a route; a restored shell does not. One row per\n  session: a session resumed by hand under a second route name shows once. A\n  transcript ending in claude's `/exit` user row is still offered, marked\n  `exited` in the age column (codex and opencode record no exit at all). It\n  prints one table, one row per candidate, with that session's first user message, last user message\n  and last assistant message read from the transcript, then asks\n  `revive [all|1,3,5|none]:`; --yes answers `all`. Each pick spawns a tmux\n  session named for the route running `boop tui <harness> --name <name> --cwd\n  <cwd>` with the harness's own resume argument, and waits up to 60 s for the\n  route to re-register that same session on a live pane. A live target refuses.\n\nDEBUG: what just went wrong, without opening a log:\n    boop debug [--since 2m] [--lane <id>] [--json]\n  The WARN/ERROR tail of every ~/.agent/lanes/<lane>/supervise.log plus the\n  store's kind=error trace events, grouped by lane, oldest first inside a lane.\n  Named, it answers one lane in full, five sections, `none` for an empty one:\n    boop debug <lane>\n  1 route (kind, harness, model, session, cwd, parent, liveness, last turn),\n  2 the last 5 mail rows with the rung each landed on, 3 the worktree's last 5\n  commits and its dirty count, 4 the last 3 assistant turns and tool calls,\n  5 the alert window above.\n  `boop --help` prints a one-line banner when that window is non-empty, and\n  nothing when it is clean.\n\nLIVENESS: a lane can die silently, producing nothing. Liveness is TWO checks:\n    1. process alive:    boop job get <lane>\n    2. worktree changed: git -C <worktree> status --short\n  A REPORT.md at the root alone proves nothing; check its mtime and first line\n  against the lane you dispatched.\n  `boop job list --all` adds what the registry does not hold: unregistered\n  tmux sessions and claude Agent-tool worktrees, with measured liveness for\n  pane-less routes.\n\nMONITOR: one lane report joins route state, resolved trace sessions, latest-turn\ntoken deltas, the last 100 structured events, supervisor logs, report progress,\nmail and exit state:\n    boop job get <lane>\n  `phase` distinguishes active thinking, active tool work, clean completion,\n  pre-model death, silent death, failed completion, idle, and unknown. Use\n  `boop job get <lane> --touched` to include worktree changes.\n\nTRANSPORT: every lane pane runs ONE command, whatever the harness:\n    boop job run --lane <id> --harness <h> --brief <abs> --model <m>\n  That supervisor owns the harness conversation and the lane's mailbox. It opens\n  the conversation with the brief, drains the mailbox every 700 ms, and starts a\n  resume turn for anything the harness would not take mid-turn. Nothing is ever\n  dropped and no hail needs a human re-dispatch.\n\nDELIVERY: what one send does after the row is written.\n  A kind=lane route is handed to its supervisor (stream-json stdin for claude,\n  app-server turn/steer for codex). A kind=coordinator route (a pane running\n  `boop tui <harness>`) goes through the harness door; nothing is typed:\n    claude    unix socket `~/.claude/sessions/<pid>.json` names; next turn boundary\n    codex     `codex queue --thread <id> --remote` on the remote-control daemon\n    opencode  `POST /session/<id>/prompt_async` on boop's `opencode serve` (:4097)\n    kimi      no door; spawn a lane instead\n  The recipient takes it as its next prompt; no agent reads a mailbox. A route\n  with no harness, or a session the door cannot find, walks down the ladder to\n  the hook inbox, the pane, then the mailbox; no send reports a refusal.\n  Proof of delivery is the transition history, one row per rung the ladder\n  walked (appended, held-for-turn-boundary, queued-in-hook-inbox,\n  pasted-into-pane, held-in-mailbox, accepted-by-harness):\n    boop db \"SELECT * FROM agent_delivery_transition ORDER BY sequence\"\n  and `boop mail wait <message-id>` prints that history.\n  A route takes at most its live connects' worth of door pushes per window\n  (lane children, floor BOOP_DOOR_FLOOR=32, window BOOP_DOOR_WINDOW_SECS=60);\n  past that it is cooled off for BOOP_DOOR_COOLDOWN_SECS=300, the row lands\n  `cooled-off`, and the trip is a row in agent_door_blowout.\n\nREMINDERS: recurring sends to an existing explicit route, no agent spawn:\n    boop beep remind add <name> <route> <body> --every 30m --until <unix-seconds-or-RFC3339>\n    boop beep remind run [--once] [--mail-dir <dir>]\n    boop beep remind list [--mail-dir <dir>]\n    boop beep remind cancel <name> [--mail-dir <dir>]\n  First occurrence follows one interval; expiry is exclusive and mandatory.\n  One active schedule and outstanding occurrence per route. Turn-ended or a\n  threaded reply releases the next occurrence; admission/ack alone does not.\n  One runner per mail directory, at most 32 active schedules. Missed intervals\n  collapse. Definite refusals retry the same envelope at the interval.\n  Uncertain delivery after a crash remains outstanding for inspection.\n  Run stays foreground and observes door turn ends until expiry. --once is a\n  single tick for supervisor/threaded-reply receipts; use foreground for doors.\n  Restart it with the same mail dir. At most 32 completion observers run.\n  Cancel/expiry prevent future delivery; already accepted work cannot be recalled.\n  Native doors and existing supervised lanes are supported. ACPX mode is held\n  with an explanation because the configured queue can accept without a turn.\n\nMARKDOWN MAIL: opt in to watching a directory; each ready `.md` file is\n  imported once, delivered, then moved under its receipt-state directory:\n    boop mail watch <dir> [--once] [--mail-dir <dir>]\n  YAML-style frontmatter accepts `to`, `from`, `harness`, `cwd`, `worktree`,\n  optional `branch`, and optional `preset`. `to` falls back to the filename\n  stem. Unknown recipients need `harness`, `cwd`, and `worktree`; refusal is\n  recorded in the mail row. Files with only an appended receipt after a watcher\n  restart move to `uncertain/` for inspection without automatic redelivery.\n\nSEND: one verb, `boop mail send`. It sends and then blocks for the answer:\n    boop mail send --to <route> <body> [--timeout <s>] [--kind <k>] [--as <name>]\n    boop mail send --to <route> <body> --no-wait   send and return\n  <route> is a lane, a coordinator, a native, or one of two aliases:\n    boop mail send --to parent \"done with x\"   the caller's own parent edge\n    boop mail send --to children \"stop\"        every live child of the caller\n  Neither end of an alias edge is spelled by the caller; the registry holds it.\nSHOUT + SCREAM: the broadcast pair, scoped to every connected agent (live\n  panes and registered pane-less routes), the caller excepted:\n    boop beep shout [body] [--kind hail]   one row per agent; a bare shout\n                                           sends \"stahp what ur doing please\"\n    boop beep scream [body]              interrupt too: the harness's\n                                           interrupt key into every live TUI\n                                           pane (claude/codex Esc, opencode\n                                           C-g) and a kind=cancel row into\n                                           every lane; a bare scream sends\n                                           \"stop what ur doing check ps\"\n  A lane supervisor answers a cancel row with channel.interrupt() and the\n  body opens the lane's next turn. TUI keys require a measured busy session;\n  idle and unknown sessions take no keys. One declared key is sent, then idle\n  is confirmed before the hail is delivered. A fan-out\n  prints one line per target and ends in a tally; nothing blocks.\n  It walks the same ladder every send walks, prints the rung that took the row,\n  then blocks. Exits: 0 on a reply or the recipient's turn ending, 124 on the\n  timeout, 3 when the route dies first. The last line is always the next\n  command: `boop mail wait <id>` after an answer, `boop debug <route>` after a\n  failure. `--as <name>` is the sender when the whoami ladder cannot say it,\n  the same spelling `boop mail wait --me --as <name>` takes.\n  A route named after a `beep` subcommand (lane, agent, ps, pstree, harness) is\n  unreachable and says so; rename it.\n\nWAIT: every agent can background a shell, so the universal push is a block.\n  A wait on a door-delivered hail also ends when the recipient's turn ends\n  (claude registry status, codex thread/status/changed, opencode session.idle),\n  printing `<route> turn ended (<status>)`; a reply mail ends it sooner.\n    boop mail wait <message-id>     the reply to what you just sent\n    boop job wait <lane>            a registered lane's result row, its rc\n    boop mail wait --me [--as <name>]   the next unread mail addressed to you\n  A wip commit arrives as your next prompt; `boop mail wait --me` serves the rows\n  that stop at the mailbox (yield, head_rewound, a done commit and result), so a\n  coordinator running lanes keeps one armed.\n  Default timeout 540s (under the 10-minute cap a background shell gives you),\n  `--wait-timeout <s>` overrides it, and a timeout exits 124 printing the\n  re-run line on stdout AND stderr. A lane whose typed expectations are unmet\n  after a clean exit is rewritten to exit 4, the \"task incomplete\" exit, with\n  the failed assertions in the row's detail; a lane route that goes dead with\n  no result row exits 3. A reply is a row naming your id in `reply_to`, or the\n  recipient's next mail back to you. Every arrival is\n  printed and stamped delivered, so a second wait on the same id blocks\n  instead of replaying it. The LAST line of every exit is the next command to\n  run; nobody composes one by hand.\n\nACK: age-based bulk-mark, NOT proof-of-read:\n    boop beep message ack\n  An ack proves a read at best, never compliance; compliance is the work's own\n  artifacts.\n\nROUTE: the session id one lane answers on, whose route cwd is its worktree:\n    boop beep lane route <lane>\n  Mailbox: ~/.agent/boop.db (agent_mail + agent_route); --mail-dir names the\n  directory holding it.\n\nTRACE + PURPOSE: a process can host successive conversation ids after /clear\nor /new. A resumed conversation can retain its id in a new process. Compaction\ncan retain the conversation id. Traces group conversations on recorded evidence:\n    agent_trace       trace_id, root_session_id, started_ts\n    agent_trace_span  session_id -> trace_id, attach_id (WHY it attached)\n    agent_lane        one row per spawn: goal text, brief path id, brief body id\n    markdown_cache    digest UNIQUE, body, bytes, first_ts (briefs dedupe here)\n  `lane create` opens `trace-<lane>`; `--trace <id>` continues an existing one.\n  Native wrappers record session-boundary events when the conversation changes\n  within one frontend process. Each event names both sessions, PID and process\n  start time. Both sessions retain process_pid and process_start_secs attributes;\n  process_previous_session names the prior conversation. A close followed by a\n  new conversation retains that relation. A new process starts a new history.\n  These boundaries record observed conversation changes, without guessing which\n  command or task caused them. Existing trace memberships remain unchanged.\n  A session attaches only on evidence boop holds: lane-create, lane-run,\n  supervisor-conversation, backfill-spawned-edge. Adjacency in time is NOT\n  evidence, so an unattached session stays unattached; a wrong attach would\n  silently merge two arcs.\n    boop db \"SELECT t.value, d.value FROM agent_trace_span s\n      JOIN dict_trace t ON t.id=s.trace_id\n      JOIN dict_session d ON d.id=s.session_id\"\n  The brief body is stored AS OF SPAWN. Editing the file afterward does not\n  change what the store says the lane was told.\n\nSTORE SCHEMA: this build writes version 38. A store written by an older\nbuild is refused, and `boop db sync create --rebuild` drops every stored row\nand re-projects every transcript from byte 0 (about 18 s over 1.5 GB here).\nNothing is wiped without that flag.\n\nSQL: the store is SQLite at ~/.agent/boop.db; `boop db \"<sql>\"` queries it\n  read-only. sqlite3 dot-commands (.schema, .tables) are NOT supported; the\n  passthrough takes plain SQL only.\n\nBOOP_NO_SYNC=1 in the environment skips the startup transcript sync for every\n  verb, so a read hits the store as it stands instead of paying a cold sync.\n\nREAD: the questions agents ask most, each one verb, no SQL and no schema probe:\n    boop db search <text> [--days 7] [--harness H] [--limit 50]   who said X\n    boop db sessions [--days 7] [--harness H]   what ran where: id, harness,\n                                                cwd, branch, turns, last_ts\n    boop db lanes [--days 7]                    spawns with model, branch,\n                                                parent, goal, result rc+detail\n    boop db mail <route> [--kind result]        one route's inbox and outbox\n    boop db schema                              every table with its columns\n    boop db status [--window <min>]             who is alive and what it cost\n    boop db usage burn-rate                     tokens/min, dollars/hour\n    boop db price list                          the model price table\n  `--format text` prints tab-separated rows; the default is NDJSON. Every\n  text column in the store is an id into a `dict_*` table (`agent_turn` holds\n  `role_id`, `session_id`, and its text in `said`); the verbs above do those\n  joins so a hand-written query is the exception.\n\nFAVORITE: pin markdown you want to keep, read it back later:\n    boop me favorite -1 --note <why>      the newest assistant turn of the\n      caller's own conversation; -2 is the one before, and -1 is the default\n    boop db favorite add --file <md> [--note <why>] [--source <text>]\n    boop db favorite list --limit 10 --format text\n    boop db favorite show <id>\n    boop db favorite edit <id> --note <why>\n    boop db favorite delete <id>\n  `me` resolves the caller from BOOP_SESSION, so run it inside the pane whose\n  turn you want. Bodies dedupe through markdown_cache and are immutable; note\n  and source are editable.\n\nTAGS: one tag table every surface shares (favorites, comments, turns, lanes).\n  Search reads agent_tag only, never message bodies, so offering past tags\n  never drags comment prose into the list:\n    boop tag add rust perf --source favorite:12   apply; --source defaults to\n      the caller's own route, `cli` when the whoami ladder cannot name it\n    boop tag recent -n 5              the recently used tags, newest use first\n    boop tag search rus -n 20         substring match on the tag column\n    boop tag list                     every tag, most used first\n    boop tag of favorite:12           the tags one source carries\n    boop tag for turn:s1:4 turn:s1:7  the same read for a whole batch: text\n                                      rows are `source tag...`, json is one\n                                      object keyed by source\n    boop tag sources rust             the sources one tag hangs on\n    boop tag rm rust --source favorite:12\n    boop tag backfill                 favorite notes become tags, once\n  Text rows are tab-separated `tag uses last_used_iso`; `--format json` prints\n  the same rows as one array. `boop me favorite --note` tags what it pins.\n\nME: the caller's own conversation.\n    boop me mood [--as <name>]        the mood template hails render with\n    boop me favorite -1               see FAVORITE\n    boop remind 3                     print the latest three user messages\n                                      from the BOOP_SESSION conversation\n  `remind` requires a tracked caller session; it never infers a session from\n  the current working directory. Messages print oldest-to-newest within the\n  selected window.\n\nSHELL: `eval \"$(boop shell-init bash)\"` defines codex, claude, ccz, kimi and\n  opencode as functions. Inside tmux they run `boop tui <harness>`, registering\n  the pane. Outside tmux they register a pane-less coordinator <entry>-<dir>\n  and stamp BOOP_SESSION, so fresh launches and resumes keep one boop id per\n  directory. Every wrapped TUI logs to\n  ~/.agent/lanes/<harness>-<pane>/supervise.log and never into its own screen.\n\nIDENTITY: two rungs only: `--as <name>`, then the BOOP_SESSION env stamp.\n  `boop tui` writes the stamp; a session that predates it passes\n  BOOP_SESSION=<name> on spawns or `--as` on every verb. A native subagent\n  shares its spawner's process, so the stamp names the spawner:\n    boop me register <name> --parent <route>\n  prints the instruction; every verb the native runs carries `--as <name>`.\n  A bare `wait --me` under a lane stamp with live native children is refused\n  with the candidates listed. `boop me whoami` prints which rung named you.\n\nPRESETS: model spelling is presets only; `boop config presets` lists name,\n  harness, model, effort, bin (`--format json` prints the same rows as a JSON\n  array). Lane defaults: flash4 or pro4; luna for codex\n  (sol only on an explicit ask); k3 for kimi; glm53 for claude through z.ai\n  (bin ccz). The codex/gpt and claude families through opencode are refused at\n  spawn: each has a flat-rate harness and opencode bills them metered. Gemini is allowed.\n\nDISK: each lane's cargo target dir belongs to boop, so no lane fills the laptop.\n  PLACEMENT: `lane create` sets CARGO_TARGET_DIR=<lanes root>/<lane>/target on\n    the lane's spawn (lanes root = BOOP_LANE_TARGET_ROOT, else ~/.agent/lanes).\n    A caller `--env CARGO_TARGET_DIR=...` wins; `--dry-run` prints `target:`.\n    The `boop-start` warmup keeps its own shared cache and is unchanged.\n  RECLAIM: every supervisor exit path (result written, retired, signalled)\n    deletes that lane's target dir; so does `lane delete`. Only a path under the\n    lane target root is ever removed; anything else is refused with a WARN. A\n    revive rebuilds the dir.\n  WORKTREE: `lane delete <lane>` also removes the worktree and branch when\n    `git branch --merged <base>` lists it (`--merged-into <branch>`, else the\n    lane's base branch, else main); an unmerged worktree stays and prints\n    `kept worktree <path> (unmerged)`.\n  FLOOR: `lane create` and each parked supervisor tick (once a minute) read the\n    free disk on the target root's volume. Below BOOP_DISK_FLOOR_GB (default\n    30), retired or dead lane targets are evicted oldest-first until above it.\n    Still below: `lane create` exits non-zero naming free space and the biggest\n    targets, and a parked lane mails one `disk-low free=<n>G` row (per 10 min).\n\nLAWS:\n  1 Every lane spawn goes through `lane create`; a bare tmux spawn leaves no\n    edge and no tracking.\n  2 Claude-model workers on the user's own plan are the coordinator's native\n    subagents (Agent tool). Lanes are for opencode, codex, kimi and ccz.\n  3 A lane can die silently. Liveness is reported by `boop job get <lane>`\n    AND `git -C <worktree> status --short`. A REPORT.md alone proves nothing.\n  4 Give each lane its own CARGO_TARGET_DIR; boop places it and reclaims it,\n    so no lane and no hand-run spawn shares one.\n  5 A brief never writes an absolute `cd` to the primary checkout; the lane\n    works in $PWD, its worktree.\n  6 `lane delete --state dead` removes each dead lane's own worktree and\n    nothing above it; `--dry-run` first. Nothing in boop runs rm -rf on\n    .boop-worktrees.\n  7 A mail receipt proves a read at best, never compliance.\n  8 Codex native subagents need sandbox_mode=danger-full-access plus ACP\n    session mode agent-full-access, or their boop calls cannot write the mail\n    dir or .git/worktrees.\n  9 Yield, head_rewound and done-status commit rows stay in the mailbox; a wip\n    commit and a blocked commit take the door for subscribed routes (the parent\n    by default). The parent collects the mailbox rows with `boop job wait <lane>`\n    for an rc, a backgrounded `boop mail wait --me &` for the batch.\n\nBUILD: hafley-rs crates/boop; `cargo install --path crates/boop --force` from\n  main installs ~/.cargo/bin/boop. `boop --version` prints version and sha.\n\nMOCK TUI: every harness adapter declares `mock_tui_launch`, the recipe that\n  runs its real TUI against a loopback llmock provider (no credentials).\n  Executable overrides: CODEX_BIN, CLAUDE_BIN (ccz rides this), OPENCODE_BIN,\n  KIMI_BIN, LLMOCK_BIN. Provider install:\n    cargo install --git https://github.com/larsakerlund/llmock.git \\\n      --tag v0.1.2 --locked llmock\n  The recipe lives in boop-harness `harness/mock_tui.rs`; the integration\n  test that drives it is crates/boop/tests/shout_interrupt.rs.")]
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
  Send(SendArgs),
  #[doc = "Drain mail addressed to the caller and mark each row handed over"]
  Recv(RecvArgs),
  #[doc = "Wait for a reply, job result, or the next row addressed to --me"]
  Wait(MailWaitArgs),
  #[doc = "Import ready Markdown messages from a directory until stopped"]
  Watch(WatchArgs),
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
  AgentSummary(AgentSummaryArgs),
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
  Lanes(LanesArgs),
  #[doc = "Mail to or from one route, newest first"]
  Mail(DbMailArgs),
  #[doc = "Every table and view with its columns and join keys, so a query never starts with a probe of `sqlite_master`"]
  Schema(SchemaArgs),
  #[doc = "Who is alive, who moved recently, and what it cost"]
  Status(StatusArgs),
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
  pub args: UsageArgs,#[command(subcommand)]
  pub cmd: Option<DbUsageCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum DbUsageCmd {
  #[doc = "Gap-aware billing windows"]
  Blocks(BlocksArgs),
  #[doc = "Tokens per minute and dollars per hour over a trailing window"]
  BurnRate(BurnRateArgs),
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
  Edit(EditArgs),
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
  Mood(MoodArgs),
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
  Presets(PresetsArgs),
}

#[derive(clap::Args, Debug)]
pub struct AgentCommand {
  #[command(subcommand)]
  pub cmd: AgentCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum AgentCmd {
  #[doc = "Synchronize incremental transcript facts, then emit the versioned CASS-compatible Boop agent summary"]
  Summary(SummaryArgs),
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
  Paste(PasteArgs),
  #[doc = "pid, rss, cpu, uptime, child count per live lane"]
  Ps(PsArgs),
  #[doc = "Filesystem-style tree of lanes by parent edge. Folded (audit 2026-08-25): `beep lane list` carries the parent column"]
  Pstree(PstreeArgs),
  #[doc = "Persistent recipient selection: list live harness panes, tick one route, record focus, or clear the set"]
  Selection(BeepSelectionCommand),
  #[doc = "One row to every connected agent (live panes and registered pane-less routes), the caller excepted. The stop-gap broadcast"]
  Shout(ShoutArgs),
  #[doc = "Interrupt busy agents with one declared harness key before delivering the message. Idle and unknown TUIs take no keys; lanes take cancel rows"]
  Scream(ScreamArgs),
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
  Cancel(CancelArgs),
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
  Waterfall(WaterfallArgs),
  #[doc = "Register or update a native/coordinator route. Omitted fields are preserved"]
  Register(BeepAgentRegisterArgs),
  #[doc = "Append a completion row and remove the registry row"]
  Done(DoneArgs),
  #[doc = "Receive a lane's commits as pushes. `<lane>` names one lane, `children` every current child plus a wildcard, `'*'` every lane the caller parents"]
  Subscribe(SubscribeArgs),
  #[doc = "Stop receiving a lane's commit pushes"]
  Unsubscribe(UnsubscribeArgs),
}

#[derive(clap::Args, Debug)]
pub struct BeepMessageCommand {
  #[command(subcommand)]
  pub cmd: BeepMessageCmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepMessageCmd {
  #[doc = "Mark mail handled, in bulk. Folded (audit 2026-08-25): age-based bulk-mark proves no read and no compliance"]
  Ack(AckArgs),
}

#[derive(clap::Args, Debug)]
#[command(subcommand_negates_reqs = true, args_conflicts_with_subcommands = true)]
pub struct BeepForkCommand {
  #[command(flatten)]
  pub args: ForkArgs,#[command(subcommand)]
  pub cmd: Option<BeepForkCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepForkCmd {
  #[doc = "Merge the fork's branch into the caller's repo and deliver the lane's last assistant turn to the fork's parent"]
  Join(JoinArgs),
  #[doc = "Print `git diff <base>..<branch>` for the fork"]
  Diff(DiffArgs),
}

#[derive(clap::Args, Debug)]
#[command(subcommand_required = true)]
pub struct BeepSelectionCommand {
  #[command(flatten)]
  pub args: SelectionArgs,#[command(subcommand)]
  pub cmd: Option<BeepSelectionCmd>,
}

#[derive(clap::Subcommand, Debug)]
pub enum BeepSelectionCmd {
  #[doc = "List live Boop-controlled panes, most recently focused first"]
  List,
  #[doc = "Change one route's checkbox without replacing other selections"]
  Set(BeepSelectionSetArgs),
  #[doc = "Record a human focus event for a tmux session or pane"]
  Focus(FocusArgs),
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
  Drain(DrainArgs),
  #[doc = "Install (or remove) the two drain hooks in <cwd>/.claude/settings.json. Route registration is separate: `boop beep agent register NAME`"]
  Hooks(HooksArgs),
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
  Recent(RecentArgs),
  #[doc = "Substring match on the tag column; no message body is read"]
  Search(TagSearchArgs),
  #[doc = "Every tag, most used first"]
  List(TagListArgs),
  #[doc = "The tags one source carries"]
  Of(OfArgs),
  #[doc = "The tags several sources carry, one read for the batch"]
  For(ForArgs),
  #[doc = "The sources one tag hangs on"]
  Sources(SourcesArgs),
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
          MailCmd::Send(args) => { crate::ops::send(&args)?; }
          MailCmd::Recv(args) => { crate::ops::recv(&args)?; }
          MailCmd::Wait(args) => { crate::ops::mail_wait(&args)?; }
          MailCmd::Watch(args) => { crate::ops::watch(&args)?; }
  }
  }
          Some(Cmd::Db(group)) => {
  match group.cmd {
          Some(DbCmd::AgentSummary(args)) => { crate::ops::agent_summary(&args)?; }
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
          Some(DbUsageCmd::Blocks(args)) => { crate::ops::blocks(&args)?; }
          Some(DbUsageCmd::BurnRate(args)) => { crate::ops::burn_rate(&args)?; }
          None => { let args = group.args; crate::ops::usage(&args)?; }
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
          DbFavoriteCmd::Edit(args) => { crate::ops::edit(&args)?; }
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
          Some(DbCmd::Lanes(args)) => { crate::ops::lanes(&args)?; }
          Some(DbCmd::Mail(args)) => { crate::ops::db_mail(&args)?; }
          Some(DbCmd::Schema(args)) => { crate::ops::schema(&args)?; }
          Some(DbCmd::Status(args)) => { crate::ops::status(&args)?; }
          None => { let args = group.args; crate::ops::db(&args)?; }
  }
  }
          Some(Cmd::Debug(args)) => { crate::ops::debug(&args)?; }
          Some(Cmd::Me(group)) => {
  match group.cmd {
          Some(MeCmd::Whoami(args)) => { crate::ops::me_whoami(&args)?; }
          Some(MeCmd::Register(args)) => { crate::ops::me_register(&args)?; }
          Some(MeCmd::Mood(args)) => { crate::ops::mood(&args)?; }
          Some(MeCmd::Favorite(args)) => { crate::ops::me_favorite(&args)?; }
          None => { let args = group.args; crate::ops::me(&args)?; }
  }
  }
          Some(Cmd::Config(group)) => {
  match group.cmd {
          ConfigCmd::Path => { let args = Default::default(); crate::ops::path(&args)?; }
          ConfigCmd::Show => { let args = Default::default(); crate::ops::config_show(&args)?; }
          ConfigCmd::Presets(args) => { crate::ops::presets(&args)?; }
  }
  }
          Some(Cmd::Agent(group)) => {
  match group.cmd {
          AgentCmd::Summary(args) => { crate::ops::summary(&args)?; }
          AgentCmd::Sessions(args) => { crate::ops::agent_sessions(&args)?; }
  }
  }
          Some(Cmd::Beep(group)) => {
  match group.cmd {
          Some(BeepCmd::Remind(group)) => {
  match group.cmd {
          BeepRemindCmd::Add(args) => { crate::ops::beep_remind_add(&args)?; }
          BeepRemindCmd::List(args) => { crate::ops::beep_remind_list(&args)?; }
          BeepRemindCmd::Cancel(args) => { crate::ops::cancel(&args)?; }
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
          BeepAgentCmd::Waterfall(args) => { crate::ops::waterfall(&args)?; }
          BeepAgentCmd::Register(args) => { crate::ops::beep_agent_register(&args)?; }
          BeepAgentCmd::Done(args) => { crate::ops::done(&args)?; }
          BeepAgentCmd::Subscribe(args) => { crate::ops::subscribe(&args)?; }
          BeepAgentCmd::Unsubscribe(args) => { crate::ops::unsubscribe(&args)?; }
  }
  }
          Some(BeepCmd::Message(group)) => {
  match group.cmd {
          BeepMessageCmd::Ack(args) => { crate::ops::ack(&args)?; }
  }
  }
          Some(BeepCmd::Fork(group)) => {
  match group.cmd {
          Some(BeepForkCmd::Join(args)) => { crate::ops::join(&args)?; }
          Some(BeepForkCmd::Diff(args)) => { crate::ops::diff(&args)?; }
          None => { let args = group.args; crate::ops::fork(&args)?; }
  }
  }
          Some(BeepCmd::Paste(args)) => { crate::ops::paste(&args)?; }
          Some(BeepCmd::Ps(args)) => { crate::ops::ps(&args)?; }
          Some(BeepCmd::Pstree(args)) => { crate::ops::pstree(&args)?; }
          Some(BeepCmd::Selection(group)) => {
  match group.cmd {
          Some(BeepSelectionCmd::List) => { let args = Default::default(); crate::ops::beep_selection_list(&args)?; }
          Some(BeepSelectionCmd::Set(args)) => { crate::ops::beep_selection_set(&args)?; }
          Some(BeepSelectionCmd::Focus(args)) => { crate::ops::focus(&args)?; }
          Some(BeepSelectionCmd::Clear) => { let args = Default::default(); crate::ops::clear(&args)?; }
          None => { let args = group.args; crate::ops::selection(&args)?; }
  }
  }
          Some(BeepCmd::Shout(args)) => { crate::ops::shout(&args)?; }
          Some(BeepCmd::Scream(args)) => { crate::ops::scream(&args)?; }
          None => { let args = group.args; crate::ops::beep(&args)?; }
  }
  }
          Some(Cmd::Inbox(group)) => {
  match group.cmd {
          InboxCmd::Drain(args) => { crate::ops::drain(&args)?; }
          InboxCmd::Hooks(args) => { crate::ops::hooks(&args)?; }
  }
  }
          Some(Cmd::Remind(args)) => { crate::ops::remind(&args)?; }
          Some(Cmd::ShellInit(args)) => { crate::ops::shell_init(&args)?; }
          Some(Cmd::Tag(group)) => {
  match group.cmd {
          TagCmd::Add(args) => { crate::ops::tag_add(&args)?; }
          TagCmd::Recent(args) => { crate::ops::recent(&args)?; }
          TagCmd::Search(args) => { crate::ops::tag_search(&args)?; }
          TagCmd::List(args) => { crate::ops::tag_list(&args)?; }
          TagCmd::Of(args) => { crate::ops::of(&args)?; }
          TagCmd::For(args) => { crate::ops::r#for(&args)?; }
          TagCmd::Sources(args) => { crate::ops::sources(&args)?; }
          TagCmd::Rm(args) => { crate::ops::tag_rm(&args)?; }
          TagCmd::Backfill => { let args = Default::default(); crate::ops::backfill(&args)?; }
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
