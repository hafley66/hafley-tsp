// Imported from boop2 help fixtures. Regenerate with: node 1_import_spec.mjs
import "@typespec/http";
import "@typespec/openapi";
using Http;
using OpenAPI;

/**
 * Cross-harness agent transcript reader: drive jobs with `job`, read what agents did with `db`
 */
@service
@extension("x-clap-after-help", "DOCTRINE (this help is the usage contract; agents read it with `boop --help`):\n\nCOORDINATOR: `boop --preset codex` opens a named persistent ACPX session and\n  registers it as `coordinator`. Standard input is one prompt per line. Worker\n  hails enter the same ACPX queue with `--no-wait`; successful queue admission\n  stamps the mailbox row. A configured model preset such as `terra` may replace\n  the direct agent name. `BOOP_ACPX_BIN` selects an installed acpx executable;\n  absent that, Boop runs the pinned published ACPX package.\n\nWARMUP: after the worktree exists and before the agent starts, lane create runs\n  the repo's `boop-start` just recipe if it declares one, and a repo that does\n  not is skipped in silence. A FAILING recipe blocks the spawn: the pre-commit\n  hook needs what it installs, and a lane that cannot commit reads the abort as\n  success. `--no-start` opts out.\n\nREGISTER: one path per kind of caller. A pane registers itself by running a\n  harness TUI through Boop; a pane-less agent (a coordinator with no tmux\n  session, or a native subagent) registers by name:\n    boop tui <harness> [--cwd <dir>] [--name <id>]      interactive pane\n    boop me register <name> [--parent <id>]            pane-less route\n\nSPAWN: every lane spawn goes through lane create; bare tmux spawns leave no\nedge and stay invisible to tracking:\n    boop job create --branch feature/<name> --brief <abs-path> \\\n      --preset <p> [--goal <text>] [--wait] [--mail-dir <d>] [--dry-run]\n  ONE derivation, from the whole branch name: `feature/schema-emit` gives lane\n  id and tmux session `feature-schema-emit` (`/` spelled `-`, the one character\n  tmux cannot hold) and worktree `.boop-worktrees/feature/schema-emit` (the same\n  name as a path). No prefix is dropped and no `lane/` prefix is added.\n  Kinds are feature/fix/refactor/chore, a convention the CLI prints, not a gate.\n  REPO: --cwd wins; without it the repo holding --brief wins (and prints\n  `repo: <toplevel> (from the brief; caller stands in <other>)` when your shell\n  stands elsewhere); only a brief outside any repo falls back to your own cwd.\n  A dead name resets itself: `lane create` on a name whose worktree, branch or\n  tmux session is left over removes all three and the conversation pin before\n  spawning; a live pane refuses and names the hail instead. --reclaim is a\n  no-op alias now.\n  --base-sha defaults to origin/main's head\n  (resolved at spawn and printed), --parent to you then to the one registered\n  coordinator; the harness is the preset's.\n  Overrides: --lane <id>, --tmux <name>, --base-sha <sha>.\n  Model preset: --preset flash4 resolves through the platform config directory's\n  boop/config.json; `boop config presets` lists every name with its model, bin\n  and harness, and `--format json` prints the rows machine-shaped.\n  Alternate binary: --bin ccz runs the harness as that executable instead of its\n  own (ccz is claude under the z.ai env); a preset's `bin` key sets it per name.\n  Completion assertions: --expect-path <rel> (repeatable) names a worktree file\n  that must exist; --expect-commit-subject <text> (repeatable) an exact commit\n  subject after base-sha; --expect-commits-at-least <n> a floor on those commits.\n  One shot: worktree at base sha + spawn + route registration.\n  Always --dry-run first; the printed `cmd:` line is the literal spawn.\n\nCOMPLETION: the supervisor writes ONE row `lane <id> done rc=<n>` into the\n  parent's mailbox on every exit path, including a signalled pane; the pane's\n  own epilogue only drops the lane's route.\n  A lane spawned with --parent reports completion; do not poll.\n  A parent whose route is kind=coordinator (what `boop tui <harness>` writes)\n  gets that hail through its harness door as its next prompt; no wait needs\n  arming.\n  `--wait` blocks on that row and exits with the lane's rc, so spawn-and-join is\n  one command; `--wait-timeout <s>` (default 3600, 0 waits forever) exits 124.\n  The same wait after the fact is the one wait verb, given the lane's name:\n    boop job wait <lane> [--timeout <s>]\n  A wait whose lane route goes dead with no row exits 3 instead of blocking.\n\nCOMMIT PUSH: a lane reports by committing; its parent watches HEAD. Every\n  commit carries trailers, one per line after the subject:\n    git commit -m \"area: what changed\" -m \"Boop-Status: wip\"\n  Boop-Status  wip (the default checkpoint), done, or blocked\n  Boop-Ask     the one question, required on a blocked commit\n  Boop-Check   an optional validation receipt, `<command> -> <result>`\n  A blocked commit mints a request and takes the door, ending a\n  `boop job wait <lane>`; a done commit stays in the mailbox and the result row\n  carries the head. The parent watches the worktree reflog (its mtime plus the\n  git-write tool-call nudge); BOOP_COMMIT_QUIET_SECS (default 3) coalesces a\n  burst into one row `old..new n=<count>`, and one push per commit goes to each\n  subscriber. The body names the range:\n    git -C <worktree> log -p old..new\n  A wip commit takes the door for subscribed routes: the parent by default,\n  door for coordinator/native/acpx parents and mailbox for lane parents. Change\n  it per lane or per edge:\n    boop beep agent subscribe <lane|children|*> [--mode door|mailbox] [--as <me>]\n    boop beep agent unsubscribe <lane|children|*> [--as <me>]\n  `children` writes one row per current child plus a wildcard row. At spawn:\n    boop job create --branch feature/<name> --brief <abs-path> \\\n      --preset <p> --commit-push mailbox\n  Absent a row the parent's kind picks the default.\n\nPR PUSH: a lane can finish by opening a PR; any PR a lane or a coordinator\n  opens is pushed once to the route's subscribers.\n    boop job create --branch feature/<name> --brief <abs-path> \\\n      --post-pr [--pr-base <branch>]\n  Config `post-pr` (global or per preset) is the default; `--no-post-pr`\n  overrides it. The supervisor's `gh pr create` and transcript ingest both\n  notify; one `agent_pr_notice` row per url keeps them to one notice.\n\nRETIRE + REVIVE: a lane whose result row is written and then sees no mail for\n  BOOP_IDLE_SHUTDOWN_SECS (default 60; 0 disables) closes its harness and\n  exits with the rc it already mailed; residency reads `retired` and the\n  parent gets one `note` row. Nothing is lost: the conversation id is pinned\n  in ~/.agent/lanes/<lane>/conversation and the exact spawn in spawn.json.\n    boop mail send --to <lane> <body>\n  to a retired lane replays that spawn, re-registers the route, resumes the\n  pinned conversation, waits up to 60 s for the supervisor to report live,\n  and hands it the body as its opening turn. The send's wait then ends on the\n  lane's next yield or result row, the same rows its parent reads.\n  A coordinator pane (`boop tui <harness>`) killed without `/exit` (tmux server\n  death, SIGKILL, sleep) comes back on the conversation its route already holds.\n  After a tmux server death this is the one command to type:\n    boop job revive --dead [--since 1h] [--yes] [--socket <s>]\n    boop job revive --list [--json]      look, do not spawn\n    boop job revive <name>               one route by name\n  The precondition is THREE route fields: harness, session_id and cwd. A dead\n  coordinator row carrying all three prints REVIVABLE in `lane list`; one\n  missing a field is named and skipped by --dead. --dead offers kind=coordinator\n  routes only (a revived coordinator revives its own lanes), active within\n  --since. Registered sessions remain eligible before transcript sync. Live\n  wrapper ownership excludes a route; a restored shell does not. One row per\n  session: a session resumed by hand under a second route name shows once. A\n  transcript ending in claude's `/exit` user row is still offered, marked\n  `exited` in the age column (codex and opencode record no exit at all). It\n  prints one table, one row per candidate, with that session's first user message, last user message\n  and last assistant message read from the transcript, then asks\n  `revive [all|1,3,5|none]:`; --yes answers `all`. Each pick spawns a tmux\n  session named for the route running `boop tui <harness> --name <name> --cwd\n  <cwd>` with the harness's own resume argument, and waits up to 60 s for the\n  route to re-register that same session on a live pane. A live target refuses.\n\nDEBUG: what just went wrong, without opening a log:\n    boop debug [--since 2m] [--lane <id>] [--json]\n  The WARN/ERROR tail of every ~/.agent/lanes/<lane>/supervise.log plus the\n  store's kind=error trace events, grouped by lane, oldest first inside a lane.\n  Named, it answers one lane in full, five sections, `none` for an empty one:\n    boop debug <lane>\n  1 route (kind, harness, model, session, cwd, parent, liveness, last turn),\n  2 the last 5 mail rows with the rung each landed on, 3 the worktree's last 5\n  commits and its dirty count, 4 the last 3 assistant turns and tool calls,\n  5 the alert window above.\n  `boop --help` prints a one-line banner when that window is non-empty, and\n  nothing when it is clean.\n\nLIVENESS: a lane can die silently, producing nothing. Liveness is TWO checks:\n    1. process alive:    boop job get <lane>\n    2. worktree changed: git -C <worktree> status --short\n  A REPORT.md at the root alone proves nothing; check its mtime and first line\n  against the lane you dispatched.\n  `boop job list --all` adds what the registry does not hold: unregistered\n  tmux sessions and claude Agent-tool worktrees, with measured liveness for\n  pane-less routes.\n\nMONITOR: one lane report joins route state, resolved trace sessions, latest-turn\ntoken deltas, the last 100 structured events, supervisor logs, report progress,\nmail and exit state:\n    boop job get <lane>\n  `phase` distinguishes active thinking, active tool work, clean completion,\n  pre-model death, silent death, failed completion, idle, and unknown. Use\n  `boop job get <lane> --touched` to include worktree changes.\n\nTRANSPORT: every lane pane runs ONE command, whatever the harness:\n    boop job run --lane <id> --harness <h> --brief <abs> --model <m>\n  That supervisor owns the harness conversation and the lane's mailbox. It opens\n  the conversation with the brief, drains the mailbox every 700 ms, and starts a\n  resume turn for anything the harness would not take mid-turn. Nothing is ever\n  dropped and no hail needs a human re-dispatch.\n\nDELIVERY: what one send does after the row is written.\n  A kind=lane route is handed to its supervisor (stream-json stdin for claude,\n  app-server turn/steer for codex). A kind=coordinator route (a pane running\n  `boop tui <harness>`) goes through the harness door; nothing is typed:\n    claude    unix socket `~/.claude/sessions/<pid>.json` names; next turn boundary\n    codex     `codex queue --thread <id> --remote` on the remote-control daemon\n    opencode  `POST /session/<id>/prompt_async` on boop's `opencode serve` (:4097)\n    kimi      no door; spawn a lane instead\n  The recipient takes it as its next prompt; no agent reads a mailbox. A route\n  with no harness, or a session the door cannot find, walks down the ladder to\n  the hook inbox, the pane, then the mailbox; no send reports a refusal.\n  Proof of delivery is the transition history, one row per rung the ladder\n  walked (appended, held-for-turn-boundary, queued-in-hook-inbox,\n  pasted-into-pane, held-in-mailbox, accepted-by-harness):\n    boop db \"SELECT * FROM agent_delivery_transition ORDER BY sequence\"\n  and `boop mail wait <message-id>` prints that history.\n  A route takes at most its live connects' worth of door pushes per window\n  (lane children, floor BOOP_DOOR_FLOOR=32, window BOOP_DOOR_WINDOW_SECS=60);\n  past that it is cooled off for BOOP_DOOR_COOLDOWN_SECS=300, the row lands\n  `cooled-off`, and the trip is a row in agent_door_blowout.\n\nREMINDERS: recurring sends to an existing explicit route, no agent spawn:\n    boop beep remind add <name> <route> <body> --every 30m --until <unix-seconds-or-RFC3339>\n    boop beep remind run [--once] [--mail-dir <dir>]\n    boop beep remind list [--mail-dir <dir>]\n    boop beep remind cancel <name> [--mail-dir <dir>]\n  First occurrence follows one interval; expiry is exclusive and mandatory.\n  One active schedule and outstanding occurrence per route. Turn-ended or a\n  threaded reply releases the next occurrence; admission/ack alone does not.\n  One runner per mail directory, at most 32 active schedules. Missed intervals\n  collapse. Definite refusals retry the same envelope at the interval.\n  Uncertain delivery after a crash remains outstanding for inspection.\n  Run stays foreground and observes door turn ends until expiry. --once is a\n  single tick for supervisor/threaded-reply receipts; use foreground for doors.\n  Restart it with the same mail dir. At most 32 completion observers run.\n  Cancel/expiry prevent future delivery; already accepted work cannot be recalled.\n  Native doors and existing supervised lanes are supported. ACPX mode is held\n  with an explanation because the configured queue can accept without a turn.\n\nMARKDOWN MAIL: opt in to watching a directory; each ready `.md` file is\n  imported once, delivered, then moved under its receipt-state directory:\n    boop mail watch <dir> [--once] [--mail-dir <dir>]\n  YAML-style frontmatter accepts `to`, `from`, `harness`, `cwd`, `worktree`,\n  optional `branch`, and optional `preset`. `to` falls back to the filename\n  stem. Unknown recipients need `harness`, `cwd`, and `worktree`; refusal is\n  recorded in the mail row. Files with only an appended receipt after a watcher\n  restart move to `uncertain/` for inspection without automatic redelivery.\n\nSEND: one verb, `boop mail send`. It sends and then blocks for the answer:\n    boop mail send --to <route> <body> [--timeout <s>] [--kind <k>] [--as <name>]\n    boop mail send --to <route> <body> --no-wait   send and return\n  <route> is a lane, a coordinator, a native, or one of two aliases:\n    boop mail send --to parent \"done with x\"   the caller's own parent edge\n    boop mail send --to children \"stop\"        every live child of the caller\n  Neither end of an alias edge is spelled by the caller; the registry holds it.\nSHOUT + SCREAM: the broadcast pair, scoped to every connected agent (live\n  panes and registered pane-less routes), the caller excepted:\n    boop beep shout [body] [--kind hail]   one row per agent; a bare shout\n                                           sends \"stahp what ur doing please\"\n    boop beep scream [body]              interrupt too: the harness's\n                                           interrupt key into every live TUI\n                                           pane (claude/codex Esc, opencode\n                                           C-g) and a kind=cancel row into\n                                           every lane; a bare scream sends\n                                           \"stop what ur doing check ps\"\n  A lane supervisor answers a cancel row with channel.interrupt() and the\n  body opens the lane's next turn. TUI keys require a measured busy session;\n  idle and unknown sessions take no keys. One declared key is sent, then idle\n  is confirmed before the hail is delivered. A fan-out\n  prints one line per target and ends in a tally; nothing blocks.\n  It walks the same ladder every send walks, prints the rung that took the row,\n  then blocks. Exits: 0 on a reply or the recipient's turn ending, 124 on the\n  timeout, 3 when the route dies first. The last line is always the next\n  command: `boop mail wait <id>` after an answer, `boop debug <route>` after a\n  failure. `--as <name>` is the sender when the whoami ladder cannot say it,\n  the same spelling `boop mail wait --me --as <name>` takes.\n  A route named after a `beep` subcommand (lane, agent, ps, pstree, harness) is\n  unreachable and says so; rename it.\n\nWAIT: every agent can background a shell, so the universal push is a block.\n  A wait on a door-delivered hail also ends when the recipient's turn ends\n  (claude registry status, codex thread/status/changed, opencode session.idle),\n  printing `<route> turn ended (<status>)`; a reply mail ends it sooner.\n    boop mail wait <message-id>     the reply to what you just sent\n    boop job wait <lane>            a registered lane's result row, its rc\n    boop mail wait --me [--as <name>]   the next unread mail addressed to you\n  A wip commit arrives as your next prompt; `boop mail wait --me` serves the rows\n  that stop at the mailbox (yield, head_rewound, a done commit and result), so a\n  coordinator running lanes keeps one armed.\n  Default timeout 540s (under the 10-minute cap a background shell gives you),\n  `--wait-timeout <s>` overrides it, and a timeout exits 124 printing the\n  re-run line on stdout AND stderr. A lane whose typed expectations are unmet\n  after a clean exit is rewritten to exit 4, the \"task incomplete\" exit, with\n  the failed assertions in the row's detail; a lane route that goes dead with\n  no result row exits 3. A reply is a row naming your id in `reply_to`, or the\n  recipient's next mail back to you. Every arrival is\n  printed and stamped delivered, so a second wait on the same id blocks\n  instead of replaying it. The LAST line of every exit is the next command to\n  run; nobody composes one by hand.\n\nACK: age-based bulk-mark, NOT proof-of-read:\n    boop beep message ack\n  An ack proves a read at best, never compliance; compliance is the work's own\n  artifacts.\n\nROUTE: the session id one lane answers on, whose route cwd is its worktree:\n    boop beep lane route <lane>\n  Mailbox: ~/.agent/boop.db (agent_mail + agent_route); --mail-dir names the\n  directory holding it.\n\nTRACE + PURPOSE: a process can host successive conversation ids after /clear\nor /new. A resumed conversation can retain its id in a new process. Compaction\ncan retain the conversation id. Traces group conversations on recorded evidence:\n    agent_trace       trace_id, root_session_id, started_ts\n    agent_trace_span  session_id -> trace_id, attach_id (WHY it attached)\n    agent_lane        one row per spawn: goal text, brief path id, brief body id\n    markdown_cache    digest UNIQUE, body, bytes, first_ts (briefs dedupe here)\n  `lane create` opens `trace-<lane>`; `--trace <id>` continues an existing one.\n  Native wrappers record session-boundary events when the conversation changes\n  within one frontend process. Each event names both sessions, PID and process\n  start time. Both sessions retain process_pid and process_start_secs attributes;\n  process_previous_session names the prior conversation. A close followed by a\n  new conversation retains that relation. A new process starts a new history.\n  These boundaries record observed conversation changes, without guessing which\n  command or task caused them. Existing trace memberships remain unchanged.\n  A session attaches only on evidence boop holds: lane-create, lane-run,\n  supervisor-conversation, backfill-spawned-edge. Adjacency in time is NOT\n  evidence, so an unattached session stays unattached; a wrong attach would\n  silently merge two arcs.\n    boop db \"SELECT t.value, d.value FROM agent_trace_span s\n      JOIN dict_trace t ON t.id=s.trace_id\n      JOIN dict_session d ON d.id=s.session_id\"\n  The brief body is stored AS OF SPAWN. Editing the file afterward does not\n  change what the store says the lane was told.\n\nSTORE SCHEMA: this build writes version 38. A store written by an older\nbuild is refused, and `boop db sync create --rebuild` drops every stored row\nand re-projects every transcript from byte 0 (about 18 s over 1.5 GB here).\nNothing is wiped without that flag.\n\nSQL: the store is SQLite at ~/.agent/boop.db; `boop db \"<sql>\"` queries it\n  read-only. sqlite3 dot-commands (.schema, .tables) are NOT supported; the\n  passthrough takes plain SQL only.\n\nBOOP_NO_SYNC=1 in the environment skips the startup transcript sync for every\n  verb, so a read hits the store as it stands instead of paying a cold sync.\n\nREAD: the questions agents ask most, each one verb, no SQL and no schema probe:\n    boop db search <text> [--days 7] [--harness H] [--limit 50]   who said X\n    boop db sessions [--days 7] [--harness H]   what ran where: id, harness,\n                                                cwd, branch, turns, last_ts\n    boop db lanes [--days 7]                    spawns with model, branch,\n                                                parent, goal, result rc+detail\n    boop db mail <route> [--kind result]        one route's inbox and outbox\n    boop db schema                              every table with its columns\n    boop db status [--window <min>]             who is alive and what it cost\n    boop db usage burn-rate                     tokens/min, dollars/hour\n    boop db price list                          the model price table\n  `--format text` prints tab-separated rows; the default is NDJSON. Every\n  text column in the store is an id into a `dict_*` table (`agent_turn` holds\n  `role_id`, `session_id`, and its text in `said`); the verbs above do those\n  joins so a hand-written query is the exception.\n\nFAVORITE: pin markdown you want to keep, read it back later:\n    boop me favorite -1 --note <why>      the newest assistant turn of the\n      caller's own conversation; -2 is the one before, and -1 is the default\n    boop db favorite add --file <md> [--note <why>] [--source <text>]\n    boop db favorite list --limit 10 --format text\n    boop db favorite show <id>\n    boop db favorite edit <id> --note <why>\n    boop db favorite delete <id>\n  `me` resolves the caller from BOOP_SESSION, so run it inside the pane whose\n  turn you want. Bodies dedupe through markdown_cache and are immutable; note\n  and source are editable.\n\nTAGS: one tag table every surface shares (favorites, comments, turns, lanes).\n  Search reads agent_tag only, never message bodies, so offering past tags\n  never drags comment prose into the list:\n    boop tag add rust perf --source favorite:12   apply; --source defaults to\n      the caller's own route, `cli` when the whoami ladder cannot name it\n    boop tag recent -n 5              the recently used tags, newest use first\n    boop tag search rus -n 20         substring match on the tag column\n    boop tag list                     every tag, most used first\n    boop tag of favorite:12           the tags one source carries\n    boop tag for turn:s1:4 turn:s1:7  the same read for a whole batch: text\n                                      rows are `source tag...`, json is one\n                                      object keyed by source\n    boop tag sources rust             the sources one tag hangs on\n    boop tag rm rust --source favorite:12\n    boop tag backfill                 favorite notes become tags, once\n  Text rows are tab-separated `tag uses last_used_iso`; `--format json` prints\n  the same rows as one array. `boop me favorite --note` tags what it pins.\n\nME: the caller's own conversation.\n    boop me mood [--as <name>]        the mood template hails render with\n    boop me favorite -1               see FAVORITE\n    boop remind 3                     print the latest three user messages\n                                      from the BOOP_SESSION conversation\n  `remind` requires a tracked caller session; it never infers a session from\n  the current working directory. Messages print oldest-to-newest within the\n  selected window.\n\nSHELL: `eval \"$(boop shell-init bash)\"` defines codex, claude, ccz, kimi and\n  opencode as functions. Inside tmux they run `boop tui <harness>`, registering\n  the pane. Outside tmux they register a pane-less coordinator <entry>-<dir>\n  and stamp BOOP_SESSION, so fresh launches and resumes keep one boop id per\n  directory. Every wrapped TUI logs to\n  ~/.agent/lanes/<harness>-<pane>/supervise.log and never into its own screen.\n\nIDENTITY: two rungs only: `--as <name>`, then the BOOP_SESSION env stamp.\n  `boop tui` writes the stamp; a session that predates it passes\n  BOOP_SESSION=<name> on spawns or `--as` on every verb. A native subagent\n  shares its spawner's process, so the stamp names the spawner:\n    boop me register <name> --parent <route>\n  prints the instruction; every verb the native runs carries `--as <name>`.\n  A bare `wait --me` under a lane stamp with live native children is refused\n  with the candidates listed. `boop me whoami` prints which rung named you.\n\nPRESETS: model spelling is presets only; `boop config presets` lists name,\n  harness, model, effort, bin (`--format json` prints the same rows as a JSON\n  array). Lane defaults: flash4 or pro4; luna for codex\n  (sol only on an explicit ask); k3 for kimi; glm53 for claude through z.ai\n  (bin ccz). The codex/gpt and claude families through opencode are refused at\n  spawn: each has a flat-rate harness and opencode bills them metered. Gemini is allowed.\n\nDISK: each lane's cargo target dir belongs to boop, so no lane fills the laptop.\n  PLACEMENT: `lane create` sets CARGO_TARGET_DIR=<lanes root>/<lane>/target on\n    the lane's spawn (lanes root = BOOP_LANE_TARGET_ROOT, else ~/.agent/lanes).\n    A caller `--env CARGO_TARGET_DIR=...` wins; `--dry-run` prints `target:`.\n    The `boop-start` warmup keeps its own shared cache and is unchanged.\n  RECLAIM: every supervisor exit path (result written, retired, signalled)\n    deletes that lane's target dir; so does `lane delete`. Only a path under the\n    lane target root is ever removed; anything else is refused with a WARN. A\n    revive rebuilds the dir.\n  WORKTREE: `lane delete <lane>` also removes the worktree and branch when\n    `git branch --merged <base>` lists it (`--merged-into <branch>`, else the\n    lane's base branch, else main); an unmerged worktree stays and prints\n    `kept worktree <path> (unmerged)`.\n  FLOOR: `lane create` and each parked supervisor tick (once a minute) read the\n    free disk on the target root's volume. Below BOOP_DISK_FLOOR_GB (default\n    30), retired or dead lane targets are evicted oldest-first until above it.\n    Still below: `lane create` exits non-zero naming free space and the biggest\n    targets, and a parked lane mails one `disk-low free=<n>G` row (per 10 min).\n\nLAWS:\n  1 Every lane spawn goes through `lane create`; a bare tmux spawn leaves no\n    edge and no tracking.\n  2 Claude-model workers on the user's own plan are the coordinator's native\n    subagents (Agent tool). Lanes are for opencode, codex, kimi and ccz.\n  3 A lane can die silently. Liveness is reported by `boop job get <lane>`\n    AND `git -C <worktree> status --short`. A REPORT.md alone proves nothing.\n  4 Give each lane its own CARGO_TARGET_DIR; boop places it and reclaims it,\n    so no lane and no hand-run spawn shares one.\n  5 A brief never writes an absolute `cd` to the primary checkout; the lane\n    works in $PWD, its worktree.\n  6 `lane delete --state dead` removes each dead lane's own worktree and\n    nothing above it; `--dry-run` first. Nothing in boop runs rm -rf on\n    .boop-worktrees.\n  7 A mail receipt proves a read at best, never compliance.\n  8 Codex native subagents need sandbox_mode=danger-full-access plus ACP\n    session mode agent-full-access, or their boop calls cannot write the mail\n    dir or .git/worktrees.\n  9 Yield, head_rewound and done-status commit rows stay in the mailbox; a wip\n    commit and a blocked commit take the door for subscribed routes (the parent\n    by default). The parent collects the mailbox rows with `boop job wait <lane>`\n    for an rc, a backgrounded `boop mail wait --me &` for the batch.\n\nBUILD: hafley-rs crates/boop; `cargo install --path crates/boop --force` from\n  main installs ~/.cargo/bin/boop. `boop --version` prints version and sha.\n\nMOCK TUI: every harness adapter declares `mock_tui_launch`, the recipe that\n  runs its real TUI against a loopback llmock provider (no credentials).\n  Executable overrides: CODEX_BIN, CLAUDE_BIN (ccz rides this), OPENCODE_BIN,\n  KIMI_BIN, LLMOCK_BIN. Provider install:\n    cargo install --git https://github.com/larsakerlund/llmock.git \\\n      --tag v0.1.2 --locked llmock\n  The recipe lives in boop-harness `harness/mock_tui.rs`; the integration\n  test that drives it is crates/boop/tests/shout_interrupt.rs.")
namespace Boop;

scalar MessageId extends string;
scalar Job extends string;
scalar LaneName extends string;
scalar GitBranch extends string;

enum Values0 {
  /**
   * End the lane the way a stall kill does, reporting `parent-died`
   */
  kill,
  /**
   * Rewrite the parent edge onto the one registered coordinator, keep going
   */
  reparent,
  /**
   * Keep running with the dead edge, which is what every spawn did before the policy existed
   */
  orphan,
}

enum Values1 {
  ndjson,
  text,
}

enum Values2 {
  /**
   * Claude Code's `Stop`: the mail comes back as a block decision
   */
  stop,
  /**
   * Claude Code's `UserPromptSubmit`: the mail is printed as context
   */
  prompt,
  /**
   * A human or a script reading the inbox
   */
  plain,
}

enum Values3 {
  text,
  json,
}

enum Values4 {
  table,
  json,
}

enum Values5 {
  json,
}

enum Values6 {
  json,
  ndjson,
  table,
}

enum Values7 {
  text,
  ndjson,
}

enum Values8 {
  bash,
}

model SharedFlags0 {
  /**
   * Only lanes in this state: `live`, `idle`, `retired` or `dead`. `retired` lanes have left their pane on the idle shutdown and come back on `boop beep <lane> <body>`
   */
  @query state?: string;
}

model SharedFlags1 {
  /**
   * Only lanes on this harness: claude, codex, opencode, kimi
   */
  @query harness?: string;
}

model SharedFlags2 {
  /**
   * Include unregistered tmux sessions and native Claude subagents
   */
  @query all?: boolean;
}

model SharedFlags3 {
  /**
   * One JSON object per row; includes the full route fields
   */
  @query json?: boolean;
}

model SharedFlags4 {
  /**
   * Omit the header line; for scripts
   */
  @query no_header?: boolean;
}

model SharedFlags5 {
  /**
   * Read liveness from this tmux socket; the default server when unset. Pane ids repeat across sockets, so a throwaway socket needs it
   */
  @query socket?: string;
}

model SharedFlags6 {
  /**
   * Directory holding boop.db; defaults to ~/.agent
   */
  @query mail_dir?: string;
}

model SharedFlags7 {
  /**
   * The lane's whole identity: `feature/<name>`, also fix/, refactor/, chore/. Lane id and tmux session are the branch with `/` as `-`
   */
  @query branch?: GitBranch;
}

model SharedFlags8 {
  /**
   * Absolute path to the brief the lane reads and executes
   */
  @query brief?: string;
}

model SharedFlags9 {
  /**
   * What the lane is running toward
   */
  @query goal?: string;
}

model SharedFlags10 {
  /**
   * The format the lane's mail is rendered in; it inherits the parent's when absent
   */
  @query mood?: string;
}

model SharedFlags11 {
  /**
   * Continue an existing trace instead of opening one named for the lane. Every session this lane runs joins it
   */
  @query trace?: string;
}

model SharedFlags12 {
  /**
   * Skip the repo's `boop-start` warmup in the new worktree
   */
  @query no_start?: boolean;
}

model SharedFlags13 {
  /**
   * Repo to branch from. Without it the brief's own repo wins, and only a brief outside any repo falls back to the caller's cwd
   */
  @query cwd?: string;
}

model SharedFlags14 {
  /**
   * Defaults to origin/main's head, resolved and printed at spawn
   */
  @query base_sha?: string;
}

model SharedFlags15 {
  /**
   * A worktree-relative path that must exist for the lane to count as complete. Repeatable
   */
  @query expect_path?: string[];
}

model SharedFlags16 {
  /**
   * An exact commit subject line that must appear in a commit after base_sha for the lane to count as complete. Repeatable
   */
  @query expect_commit_subject?: string[];
}

model SharedFlags17 {
  /**
   * A lower bound on the commits after base_sha for the lane to count as complete
   */
  @query expect_commits_at_least?: string;
}

model SharedFlags18 {
  /**
   * Run this command in the lane worktree before writing its result row
   */
  @query("verify") command?: string;
}

model SharedFlags19 {
  /**
   * An env var the lane's spawn inherits, `KEY=VAL`. Repeatable; each value is shell-quoted onto the supervisor's spawn command
   */
  @query env?: Record<string>;
}

model SharedFlags20 {
  /**
   * How the lane's commits reach its parent: `door` or `mailbox`. Absent, the parent's kind picks the default
   */
  @query("commit-push") mode?: string;
}

model SharedFlags21 {
  /**
   * Finish by opening a PR: the lane brief closes with the push-and-PR line. Overrides a preset or global `post-pr`
   */
  @query post_pr?: boolean;
}

model SharedFlags22 {
  /**
   * Override a preset or global `post-pr` back off for this spawn
   */
  @query no_post_pr?: boolean;
}

model SharedFlags23 {
  /**
   * The branch `gh pr create --base` targets; default `main`
   */
  @query("pr-base") pr_base_flag?: GitBranch;
}

model SharedFlags24 {
  /**
   * Defaults to the caller, then to the one registered coordinator
   */
  @query parent?: string;
}

model SharedFlags25 {
  /**
   * What this lane does when its parent route stops answering
   */
  @query on_parent_death: Values0 = Values0.orphan;
}

model SharedFlags26 {
  /**
   * The row of the config preset table this lane spawns from: harness, model, effort. The one model spelling `lane create` takes
   */
  @query preset?: string;
}

model SharedFlags27 {
  /**
   * opencode reasoning-effort variant (low|medium|high); CLI wins over the preset's variant, and opencode's default applies when neither
   */
  @query variant?: string;
}

model SharedFlags28 {
  /**
   * Run the harness as this executable instead of its own binary (`ccz` is claude under the z.ai env). CLI wins over the preset's `bin`; the harness's own binary applies when neither names one
   */
  @query bin?: string;
}

model SharedFlags29 {
  /**
   * Seconds `--wait` blocks before exiting 124; 0 waits forever
   */
  @query wait_timeout: uint64 = 3600;
}

model SharedFlags30 {
  /**
   * Stop the job after this many seconds. The supervisor checks each poll
   */
  @query timeout?: string;
}

model SharedFlags31 {
  /**
   * Overrides the lane id derived from `--branch`
   */
  @query lane?: LaneName;
}

model SharedFlags32 {
  /**
   * Overrides the tmux session name derived from `--branch`
   */
  @query tmux?: string;
}

model SharedFlags33 {
  /**
   * tmux socket to spawn on; a throwaway socket for tests, `None` for the default server
   */
  @query socket?: string;
}

model SharedFlags34 {
  /**
   * Print the worktree, branch, base sha and the literal `cmd:` line without spawning
   */
  @query dry_run?: boolean;
}

model SharedFlags35 {
  /**
   * Folded (dead-lane-self-reset): a dead name is reset on every create, so this is a no-op alias kept for old scripts
   */
  @query reclaim?: boolean;
}

model SharedFlags36 {
  /**
   * The turnkey command after a tmux server death: print one table of dead coordinator routes, then ask which to revive
   */
  @query dead?: boolean;
}

model SharedFlags37 {
  /**
   * Print that table and exit; the read path, no prompt, no spawn
   */
  @query list?: boolean;
}

model SharedFlags38 {
  /**
   * `--list` as JSON, uncut, for a reader that draws its own table
   */
  @query json?: boolean;
}

model SharedFlags39 {
  /**
   * Skip the prompt and revive every row
   */
  @extension("x-clap-short", "y")
  @query yes?: boolean;
}

model SharedFlags40 {
  /**
   * Only routes active this recently: Ns, Nm, Nh
   */
  @query since: string = "1h";
}

model SharedFlags41 {
  /**
   * tmux socket the pane lives on; the default server when unset
   */
  @query socket?: string;
}

model SharedFlags42 {
  @query mail_dir?: string;
}

model SharedFlags43 {
  /**
   * Also print what the lane changed in its tree: commits past its base sha, uncommitted files, and the paths those commits touched
   */
  @query touched?: boolean;
}

model SharedFlags44 {
  @query tmux: string;
}

model SharedFlags45 {
  @query harness?: string;
}

model SharedFlags46 {
  @query session_id?: string;
}

model SharedFlags47 {
  @query cwd?: string;
}

model SharedFlags48 {
  @query `model`?: string;
}

model SharedFlags49 {
  @query mode?: string;
}

model SharedFlags50 {
  /**
   * The lane that summoned this one
   */
  @query parent?: string;
}

model SharedFlags51 {
  @query goal?: string;
}

model SharedFlags52 {
  /**
   * Drop only the registry route; never kill the pane. The `--parent` on-exit epilogue uses this to clean up while still running inside it
   */
  @query route_only?: boolean;
}

model SharedFlags53 {
  /**
   * Bulk delete: `dead` removes every dead lane's route and its own worktree, and nothing above it. Pair with `--dry-run` first
   */
  @query state?: string;
}

model SharedFlags54 {
  /**
   * Print what a single-lane or bulk delete would remove, and remove nothing
   */
  @query dry_run?: boolean;
}

model SharedFlags55 {
  /**
   * Check merge against this branch instead of the lane's base branch or `main`; a merged branch's worktree and branch are removed, an unmerged one is kept
   */
  @query("merged-into") branch?: GitBranch;
}

model SharedFlags56 {
  @query timeout: uint64 = 540;
}

model SharedFlags57 {
  @query children?: boolean;
}

model SharedFlags58 {
  @query("as") as_name?: string;
}

model SharedFlags59 {
  /**
   * Print what would be pruned; remove nothing
   */
  @query dry_run?: boolean;
}

model SharedFlags60 {
  @query lines?: string;
}

model SharedFlags61 {
  @query socket?: string;
}

model SharedFlags62 {
  @query format: Values1 = Values1.ndjson;
}

model SharedFlags63 {
  @query lane: LaneName;
}

model SharedFlags64 {
  @query harness: string;
}

model SharedFlags65 {
  /**
   * Absolute path to the brief that opens the conversation
   */
  @query brief: string;
}

model SharedFlags66 {
  /**
   * Reasoning effort, threaded from the preset; the harness spells it as its own config, never as `model@effort`
   */
  @query effort?: string;
}

model SharedFlags67 {
  /**
   * Continue an existing harness conversation instead of opening one
   */
  @query resume?: string;
}

model SharedFlags68 {
  /**
   * opencode reasoning-effort variant, threaded from `lane create`
   */
  @query variant?: string;
}

model SharedFlags69 {
  /**
   * The executable the harness runs as, threaded from `lane create`
   */
  @query bin?: string;
}

model SharedFlags70 {
  /**
   * Validation command carried from `lane create`
   */
  @query verify?: string;
}

model SharedFlags71 {
  @query hook: Values2 = Values2.plain;
}

model SharedFlags72 {
  @query format: Values3 = Values3.json;
}

model SharedFlags73 {
  @query limit?: string;
}

model SharedFlags74 {
  @query session?: string;
}

model SharedFlags75 {
  @query role?: string;
}

model SharedFlags76 {
  @query since?: string;
}

model SharedFlags77 {
  @query until?: string;
}

model SharedFlags78 {
  @query turn_from?: string;
}

model SharedFlags79 {
  @query turn_to?: string;
}

model SharedFlags80 {
  @query path?: string;
}

model SharedFlags81 {
  /**
   * Prefix match on the row's leading dictionary column
   */
  @query like?: string;
}

model SharedFlags82 {
  /**
   * Look back this many days
   */
  @query days: uint64 = 7;
}

model SharedFlags83 {
  /**
   * Only this harness: claude, codex, kimi, opencode
   */
  @query harness?: string;
}

model SharedFlags84 {
  @query limit: uint64 = 50;
}

model SharedFlags85 {
  @query json?: boolean;
}

model SharedFlags86 {
  /**
   * The subscriber; defaults to the caller's identity
   */
  @query("as") name?: string;
}

model SharedFlags87 {
  /**
   * The forked lane, when one comment forked off several
   */
  @query lane?: LaneName;
}

model SharedFlags88 {
  /**
   * Who the rows are from, when the whoami ladder cannot say
   */
  @query("as") name?: string;
}

model SharedFlags89 {
  /**
   * Include recipients skipped by liveness proof
   */
  @query verbose?: boolean;
}

model SharedFlags90 {
  /**
   * Print one JSON result object
   */
  @query json?: boolean;
}

model SharedFlags91 {
  @query format: Values3 = Values3.text;
}

/**
 * Cross-harness agent transcript reader: drive jobs with `job`, read what agents did with `db`
 */
@route("/")
@post
op root(
  /**
     * Run a persistent foreground ACP coordinator. Agent names such as `codex` work directly; model preset names resolve through config
     */
    @query preset?: string,
  /**
     * Registry and ACPX session name for the foreground coordinator
     */
    @query name?: string,
  /**
     * Mail registry for the foreground coordinator
     */
    @query mail_dir?: string
): void;

@route("/job")
namespace job {
  /**
   * Create and control registered agent jobs
   */
  @route("/")
  @post
  op job(

  ): void;

  @route("/list")
  namespace list {
    /**
     * Every lane, with live or dead
     */
    @route("/")
    @post
    op job_list(
      ...SharedFlags0,
      ...SharedFlags1,
      ...SharedFlags2,
      ...SharedFlags3,
      ...SharedFlags4,
      ...SharedFlags5,
      ...SharedFlags6
    ): void;

  }

  @route("/resume")
  namespace resume {
    /**
     * Continue an agent process group paused by the RSS guard
     */
    @route("/{positional_lane}")
    @post
    op job_resume(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags6
    ): void;

  }

  @route("/create")
  namespace create {
    /**
     * Make a worktree, spawn the agent, register the route
     */
    @route("/")
    @post
    op job_create(
      ...SharedFlags7,
      ...SharedFlags8,
      ...SharedFlags9,
      ...SharedFlags10,
      ...SharedFlags11,
      ...SharedFlags12,
      ...SharedFlags13,
      ...SharedFlags14,
      ...SharedFlags15,
      ...SharedFlags16,
      ...SharedFlags17,
      ...SharedFlags18,
      ...SharedFlags19,
      ...SharedFlags20,
      ...SharedFlags21,
      ...SharedFlags22,
      ...SharedFlags23,
      ...SharedFlags24,
      ...SharedFlags25,
      ...SharedFlags26,
      ...SharedFlags27,
      ...SharedFlags28,
      ...SharedFlags29,
      ...SharedFlags30,
      ...SharedFlags31,
      ...SharedFlags32,
      ...SharedFlags33,
      ...SharedFlags6,
      ...SharedFlags34,
      ...SharedFlags35
    ): void;

  }

  @route("/revive")
  namespace revive {
    /**
     * Bring a dead `boop tui` coordinator pane back on its own session. Its route must carry harness, session_id and cwd; a live target refuses
     */
    @route("/{positional_lane}")
    @post
    op job_revive(
      /**
         * The dead route to revive. Omit for `--dead` or `--list`
         */
        @path("positional_lane") lane?: LaneName,
      ...SharedFlags36,
      ...SharedFlags37,
      ...SharedFlags38,
      ...SharedFlags39,
      ...SharedFlags40,
      ...SharedFlags41,
      ...SharedFlags42
    ): void;

  }

  @route("/get")
  namespace get {
    /**
     * One lane's route and state
     */
    @route("/{positional_lane}")
    @post
    op job_get(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags43,
      ...SharedFlags42
    ): void;

  }

  @route("/where")
  namespace where {
    /**
     * The lane's worktree path alone, for `cd "$(boop beep lane where x)"`
     */
    @route("/{positional_lane}")
    @post
    op job_where(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags42
    ): void;

  }

  @route("/patch")
  namespace patch {
    /**
     * Compatibility spelling for rebinding a registered route to an existing pane. Preserves its kind; fresh interactive registration uses agent register
     */
    @route("/{positional_lane}")
    @post
    op job_patch(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags44,
      ...SharedFlags45,
      ...SharedFlags46,
      ...SharedFlags47,
      ...SharedFlags48,
      ...SharedFlags49,
      ...SharedFlags50,
      ...SharedFlags51,
      ...SharedFlags42
    ): void;

  }

  @route("/delete")
  namespace delete {
    /**
     * Stop a lane and forget it, or bulk-delete by state
     */
    @route("/{positional_lane}")
    @post
    op job_delete(
      /**
         * One lane: kill its pane and drop its route. Omit for a bulk delete by `--state`
         */
        @path("positional_lane") lane?: LaneName,
      ...SharedFlags52,
      ...SharedFlags53,
      ...SharedFlags54,
      ...SharedFlags55,
      ...SharedFlags42
    ): void;

  }

  @route("/rm")
  namespace rm {
    /**
     * Forget a stopped job's route and keep its worktree and history
     */
    @route("/{positional_lane}")
    @post
    op job_rm(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags42
    ): void;

  }

  @route("/kill")
  namespace kill {
    /**
     * Stop a lane process and retain its route and result history
     */
    @route("/{positional_lane}")
    @post
    op job_kill(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags42
    ): void;

  }

  @route("/wait")
  namespace wait {
    /**
     * Wait for a job's result row
     */
    @route("/{positional_lane}")
    @post
    op job_wait(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags56,
      ...SharedFlags42
    ): void;

  }

  @route("/attach")
  namespace attach {
    /**
     * Attach to a job's tmux session
     */
    @route("/{positional_lane}")
    @post
    op job_attach(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags42
    ): void;

  }

  @route("/signal")
  namespace signal {
    /**
     * Send a POSIX signal to this job or its direct children
     */
    @route("/{positional_signal}")
    @post
    op job_signal(
      @path("positional_signal") signal: string,
      ...SharedFlags57,
      ...SharedFlags58,
      ...SharedFlags42
    ): void;

  }

  @route("/prune")
  namespace prune {
    /**
     * Drop routes whose tmux session is gone AND whose recorded pid, if any, is not alive. Refuses when tmux is unreachable
     */
    @route("/")
    @post
    op job_prune(
      ...SharedFlags59,
      ...SharedFlags42
    ): void;

  }

  @route("/route")
  namespace route {
    /**
     * Which tmux pane and harness session id. Folded (audit 2026-08-25): `beep lane get` prints the same route row
     */
    @route("/{positional_lane}")
    @post
    op job_route(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags42
    ): void;

  }

  @route("/pane")
  namespace pane {
    /**
     * Show the lane's screen
     */
    @route("/{positional_lane}")
    @post
    op job_pane(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags60,
      ...SharedFlags61,
      ...SharedFlags42
    ): void;

  }

  @route("/squares")
  namespace squares {
    /**
     * The user/agent squares on the lane's screen: one per visible turn, in screen order, each with the viewport rows it sits on. Reads the pane through the multiplexer and reports the pane's own geometry, so a renderer drawing the right-margin navigator asks one verb for both
     */
    @route("/{positional_lane}")
    @post
    op job_squares(
      @path("positional_lane") lane: LaneName,
      ...SharedFlags62,
      ...SharedFlags61,
      ...SharedFlags42
    ): void;

  }

  @route("/message")
  namespace message {
    /**
     * The lane's mailbox
     */
    @route("/")
    @post
    op job_message(

    ): void;

    @route("/list")
    namespace list {
      /**
       * Every mail row addressed to or sent by the lane, oldest first
       */
      @route("/{positional_lane}")
      @post
      op job_message_list(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags6
      ): void;

    }

  }

  @route("/run")
  namespace run {
    /**
     * Drive one lane conversation. This is what a lane pane runs; a human calls `lane create`, never this. Folded (audit 2026-08-25): the supervisor's entry point, spawned by `lane create`
     */
    @extension("x-clap-hidden", true)
    @route("/")
    @post
    op job_run(
      ...SharedFlags63,
      ...SharedFlags64,
      ...SharedFlags65,
      ...SharedFlags48,
      ...SharedFlags66,
      ...SharedFlags67,
      ...SharedFlags68,
      ...SharedFlags69,
      ...SharedFlags70,
      ...SharedFlags42
    ): void;

  }

}

@route("/mail")
namespace mail {
  /**
   * Send, receive, and wait for addressed mail
   */
  @route("/")
  @post
  op mail(

  ): void;

  @route("/send")
  namespace send {
    /**
     * Deliver a message to a registered route
     */
    @route("/{positional_body}")
    @post
    op mail_send(
      @path("positional_body") body: string,
      @query("to") job: string,
      ...SharedFlags58,
      @query kind: string = "request",
      ...SharedFlags56,
      @query no_wait?: boolean,
      ...SharedFlags42
    ): void;

  }

  @route("/recv")
  namespace recv {
    /**
     * Drain mail addressed to the caller and mark each row handed over
     */
    @route("/")
    @post
    op mail_recv(
      ...SharedFlags58,
      ...SharedFlags71,
      ...SharedFlags42
    ): void;

  }

  @route("/wait")
  namespace wait {
    /**
     * Wait for a reply, job result, or the next row addressed to --me
     */
    @route("/{positional_id_or_job}")
    @post
    op mail_wait(
      @path("positional_id_or_job") id_or_job?: MessageId | Job,
      @query me?: boolean,
      ...SharedFlags58,
      ...SharedFlags56,
      ...SharedFlags42
    ): void;

  }

  @route("/watch")
  namespace watch {
    /**
     * Import ready Markdown messages from a directory until stopped
     */
    @route("/{positional_directory}")
    @post
    op mail_watch(
      /**
         * Directory containing ready `.md` files
         */
        @path("positional_directory") directory: string,
      /**
         * Process one scan and exit; useful for supervised one-shot runs
         */
        @query once?: boolean,
      ...SharedFlags42
    ): void;

  }

}

@route("/db")
namespace db {
  /**
   * Run raw SQL read-only against the store (the default `db` form), or read/count what agents did through a `db` subcommand
   */
  @extension("x-clap-args-conflicts-with-subcommands", true)
  @route("/{positional_sql}")
  @post
  op db(
    /**
       * The SQL to run against ~/.agent/boop.db
       */
      @path("positional_sql") sql?: string,
    /**
       * Output format for the SQL passthrough
       */
      @query format?: Values1
  ): void;

  @route("/agent-summary")
  namespace agent_summary {
    /**
     * Versioned CASS-compatible agent/runtime/activity summary. CASS issue, reservation, and provider records are separate contracts
     */
    @route("/")
    @post
    op db_agent_summary(
      ...SharedFlags72,
      ...SharedFlags42
    ): void;

  }

  @route("/session")
  namespace session {
    /**
     * Rows from `agent_session`: one row per transcript session. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_session"` answers it
     */
    @route("/")
    @post
    op db_session(

    ): void;

    @route("/list")
    namespace list {
      /**
       * Every session row from `agent_session`, newest first
       */
      @route("/")
      @post
      op db_session_list(
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

    @route("/get")
    namespace get {
      /**
       * The one `agent_session` row matching this session id
       */
      @route("/{positional_session}")
      @post
      op db_session_get(
        @path("positional_session") session: string,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/turn")
  namespace turn {
    /**
     * Rows from `agent_turn`: one row per user/assistant turn. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_turn"` answers it
     */
    @route("/")
    @post
    op db_turn(

    ): void;

    @route("/list")
    namespace list {
      /**
       * Every `agent_turn` row matching `QueryArgs`
       */
      @route("/")
      @post
      op db_turn_list(
        ...SharedFlags45,
        ...SharedFlags74,
        ...SharedFlags75,
        ...SharedFlags76,
        ...SharedFlags77,
        ...SharedFlags78,
        ...SharedFlags79,
        ...SharedFlags80,
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

    @route("/get")
    namespace get {
      /**
       * The one `agent_turn` row at this session and turn number
       */
      @route("/{positional_session}/{positional_turn}")
      @post
      op db_turn_get(
        @path("positional_session") session: string,
        @path("positional_turn") turn: string,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/chat")
  namespace chat {
    /**
     * `agent_turn` projected into NDJSON chat-repr turns
     */
    @route("/")
    @post
    op db_chat(

    ): void;

    @route("/list")
    namespace list {
      /**
       * `agent_turn` rows projected into chat-repr NDJSON turns
       */
      @route("/")
      @post
      op db_chat_list(
        ...SharedFlags45,
        ...SharedFlags74,
        ...SharedFlags75,
        ...SharedFlags76,
        ...SharedFlags77,
        ...SharedFlags78,
        ...SharedFlags79,
        ...SharedFlags80,
        ...SharedFlags73,
        ...SharedFlags62,
        @query all?: boolean,
        @query follow?: boolean
      ): void;

    }

  }

  @route("/touch")
  namespace touch {
    /**
     * Rows from `agent_touch`: files a session read or edited. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_touch"` answers it
     */
    @route("/")
    @post
    op db_touch(

    ): void;

    @route("/list")
    namespace list {
      /**
       * The fact rows for this kind's table, filtered by `FactArgs`
       */
      @route("/")
      @post
      op db_touch_list(
        ...SharedFlags74,
        ...SharedFlags76,
        ...SharedFlags77,
        ...SharedFlags81,
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/command")
  namespace command {
    /**
     * Rows from `agent_cmd`: shell commands a session ran. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_cmd"` answers it
     */
    @route("/")
    @post
    op db_command(

    ): void;

    @route("/list")
    namespace list {
      /**
       * The fact rows for this kind's table, filtered by `FactArgs`
       */
      @route("/")
      @post
      op db_command_list(
        ...SharedFlags74,
        ...SharedFlags76,
        ...SharedFlags77,
        ...SharedFlags81,
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/fetch")
  namespace fetch {
    /**
     * Rows from `agent_fetch`: URLs a session fetched. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_fetch"` answers it
     */
    @route("/")
    @post
    op db_fetch(

    ): void;

    @route("/list")
    namespace list {
      /**
       * The fact rows for this kind's table, filtered by `FactArgs`
       */
      @route("/")
      @post
      op db_fetch_list(
        ...SharedFlags74,
        ...SharedFlags76,
        ...SharedFlags77,
        ...SharedFlags81,
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/skill")
  namespace skill {
    /**
     * Rows from `agent_skill`: skills a session invoked. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_skill"` answers it
     */
    @route("/")
    @post
    op db_skill(

    ): void;

    @route("/list")
    namespace list {
      /**
       * The fact rows for this kind's table, filtered by `FactArgs`
       */
      @route("/")
      @post
      op db_skill_list(
        ...SharedFlags74,
        ...SharedFlags76,
        ...SharedFlags77,
        ...SharedFlags81,
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/pr")
  namespace pr {
    /**
     * Rows from `agent_pr`: pull requests a session touched. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_pr"` answers it
     */
    @route("/")
    @post
    op db_pr(

    ): void;

    @route("/list")
    namespace list {
      /**
       * The fact rows for this kind's table, filtered by `FactArgs`
       */
      @route("/")
      @post
      op db_pr_list(
        ...SharedFlags74,
        ...SharedFlags76,
        ...SharedFlags77,
        ...SharedFlags81,
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/span")
  namespace span {
    /**
     * Rows from `agent_span`: live time spans a session recorded. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_span"` answers it
     */
    @route("/")
    @post
    op db_span(

    ): void;

    @route("/list")
    namespace list {
      /**
       * The fact rows for this kind's table, filtered by `FactArgs`
       */
      @route("/")
      @post
      op db_span_list(
        ...SharedFlags74,
        ...SharedFlags76,
        ...SharedFlags77,
        ...SharedFlags81,
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/edge")
  namespace edge {
    /**
     * Rows from `agent_edge`: parent/child spawn edges between sessions. Folded (audit 2026-08-25): one-table dump; `boop db "SELECT * FROM agent_edge"` answers it
     */
    @route("/")
    @post
    op db_edge(

    ): void;

    @route("/list")
    namespace list {
      /**
       * Every `agent_edge` row, filtered to one session's edges when given
       */
      @route("/")
      @post
      op db_edge_list(
        ...SharedFlags74,
        ...SharedFlags73
      ): void;

    }

  }

  @route("/usage")
  namespace usage {
    /**
     * Tokens and cost. A totals report the passthrough powers, and a parent of the row computations blocks and burn-rate; clap needs both attributes to accept the two forms
     */
    @extension("x-clap-args-conflicts-with-subcommands", true)
    @route("/")
    @post
    op db_usage(
      ...SharedFlags62,
      /**
         * Print this alias's SQL and exit
         */
        @query show_sql?: boolean
    ): void;

    @route("/blocks")
    namespace blocks {
      /**
       * Gap-aware billing windows
       */
      @route("/")
      @post
      op db_usage_blocks(
        @query window_hours: uint64 = 5,
        /**
           * Only the window that is still open
           */
          @query active?: boolean,
        ...SharedFlags62
      ): void;

    }

    @route("/burn-rate")
    namespace burn_rate {
      /**
       * Tokens per minute and dollars per hour over a trailing window
       */
      @route("/")
      @post
      op db_usage_burn_rate(
        @query window_minutes: uint64 = 60,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/price")
  namespace price {
    /**
     * The rate table cost is computed from
     */
    @route("/")
    @post
    op db_price(

    ): void;

    @route("/list")
    namespace list {
      /**
       * Every rate row in `model_price`
       */
      @route("/")
      @post
      op db_price_list(

      ): void;

    }

    @route("/set")
    namespace set {
      /**
       * Write one rate row by hand, in USD per million tokens
       */
      @route("/{positional_model}")
      @post
      op db_price_set(
        @path("positional_model") `model`: string,
        @query input_per_mtok: string,
        @query output_per_mtok: string,
        @query cache_write_5m_per_mtok: string,
        @query cache_write_1h_per_mtok: string,
        @query cache_read_per_mtok: string,
        @query source: string = "manual"
      ): void;

    }

  }

  @route("/favorite")
  namespace favorite {
    /**
     * User-pinned markdown: save a message you want to keep, read it back
     */
    @route("/")
    @post
    op db_favorite(

    ): void;

    @route("/add")
    namespace add {
      /**
       * Pin markdown into the store, from --file or stdin
       */
      @route("/")
      @post
      op db_favorite_add(
        /**
           * Markdown file to pin; stdin when absent
           */
          @query file?: string,
        /**
           * Why this one is kept
           */
          @query note?: string,
        /**
           * Where it came from: a session id, a url, plain text
           */
          @query source?: string
      ): void;

    }

    @route("/list")
    namespace list {
      /**
       * Favorites newest-first, body included
       */
      @route("/")
      @post
      op db_favorite_list(
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

    @route("/show")
    namespace show {
      /**
       * One favorite by id, body included
       */
      @route("/{positional_id}")
      @post
      op db_favorite_show(
        @path("positional_id") id: string,
        ...SharedFlags62
      ): void;

    }

    @route("/edit")
    namespace edit {
      /**
       * Rewrite the note and/or source of one favorite; the body is immutable
       */
      @route("/{positional_id}")
      @post
      op db_favorite_edit(
        @path("positional_id") id: string,
        @query note?: string,
        @query source?: string
      ): void;

    }

    @route("/delete")
    namespace delete {
      /**
       * Drop one favorite by id; its markdown body stays cached
       */
      @route("/{positional_id}")
      @post
      op db_favorite_delete(
        @path("positional_id") id: string
      ): void;

    }

  }

  @route("/sync")
  namespace sync {
    /**
     * Ingest new transcript bytes
     */
    @route("/")
    @post
    op db_sync(

    ): void;

    @route("/create")
    namespace create {
      /**
       * Ingest new transcript bytes into the store's `agent_turn` and fact tables
       */
      @route("/")
      @post
      op db_sync_create(
        @query rebuild?: boolean,
        /**
           * Keep syncing on a poll instead of returning
           */
          @query forever?: boolean,
        /**
           * Where the pass delivers the native-child completions it finds. A scratch mailbox here keeps an analysis pass off the live bus
           */
          @query mail_dir?: string
      ): void;

    }

  }

  @route("/sync-cursor")
  namespace sync_cursor {
    /**
     * How far ingest has read each transcript
     */
    @route("/")
    @post
    op db_sync_cursor(

    ): void;

    @route("/list")
    namespace list {
      /**
       * Every `sync_cursor` row: how far ingest has read each transcript
       */
      @route("/")
      @post
      op db_sync_cursor_list(
        ...SharedFlags73,
        ...SharedFlags62
      ): void;

    }

  }

  @route("/search")
  namespace search {
    /**
     * Search every harness's turns for a text, newest first; `--days 7` is the default window. Answers "who talked about X" without SQL
     */
    @route("/{positional_text}")
    @post
    op db_search(
      /**
         * Text to find, case-insensitive
         */
        @path("positional_text") text: string,
      ...SharedFlags82,
      ...SharedFlags83,
      /**
         * Return only turns classified as direct human input
         */
        @query human?: boolean,
      ...SharedFlags84,
      ...SharedFlags62
    ): void;

  }

  @route("/sessions")
  namespace sessions {
    /**
     * Sessions across every harness that moved in the window, newest first
     */
    @route("/")
    @post
    op db_sessions(
      ...SharedFlags82,
      ...SharedFlags83,
      ...SharedFlags84,
      ...SharedFlags62
    ): void;

  }

  @route("/lanes")
  namespace lanes {
    /**
     * Lanes spawned in the window, newest first, with the rc of each one's result row
     */
    @route("/")
    @post
    op db_lanes(
      ...SharedFlags82,
      ...SharedFlags84,
      ...SharedFlags62
    ): void;

  }

  @route("/mail")
  namespace mail {
    /**
     * Mail to or from one route, newest first
     */
    @route("/{positional_route}")
    @post
    op db_mail(
      /**
         * Lane, coordinator or native route name
         */
        @path("positional_route") route: string,
      /**
         * Only this kind: dispatch, result, request, completion, yield, note
         */
        @query kind?: string,
      ...SharedFlags84,
      ...SharedFlags62
    ): void;

  }

  @route("/schema")
  namespace schema {
    /**
     * Every table and view with its columns and join keys, so a query never starts with a probe of `sqlite_master`
     */
    @route("/")
    @post
    op db_schema(
      ...SharedFlags62
    ): void;

  }

  @route("/status")
  namespace status {
    /**
     * Who is alive, who moved recently, and what it cost
     */
    @route("/")
    @post
    op db_status(
      /**
         * Window in minutes
         */
        @query window: uint64 = 10,
      ...SharedFlags62
    ): void;

  }

}

@route("/debug")
namespace debug {
  /**
   * What just went wrong: recent WARN/ERROR across the lane trails and the store's error events, grouped by lane
   */
  @route("/{positional_lane}")
  @post
  op debug(
    /**
       * One lane, answered in full: route, mail, worktree, transcript, alerts. Without it, the WARN/ERROR window across every lane
       */
      @path("positional_lane") lane?: LaneName,
    /**
       * Window to read back, as `Ns`, `Nm`, `Nh` or a count of seconds
       */
      @query since: string = "2m",
    /**
       * One lane only, for the alert window
       */
      @query("lane") lane_flag?: LaneName,
    /**
       * One JSON document, `alerts` and `sync`, instead of the grouped text
       */
      @query json?: boolean,
    ...SharedFlags42
  ): void;

}

@route("/me")
namespace me {
  /**
   * The caller's own mood and favorite messages, the only verb for either. Registering a pane is `boop tui` / `boop beep agent register` now
   */
  @extension("x-clap-subcommand-required", true)
  @route("/")
  @post
  op me(
    ...SharedFlags42
  ): void;

  @route("/whoami")
  namespace whoami {
    /**
     * Report which identity rung names the caller
     */
    @route("/")
    @post
    op me_whoami(
      ...SharedFlags85,
      ...SharedFlags58
    ): void;

  }

  @route("/register")
  namespace register {
    /**
     * Register a pane-less route for a native coordinator or subagent
     */
    @route("/{positional_name}")
    @post
    op me_register(
      @path("positional_name") name: string,
      ...SharedFlags45,
      @query parent?: string
    ): void;

  }

  @route("/mood")
  namespace mood {
    /**
     * Read or set the format agents mail this session in. No name prints the effective mood and the session that set it
     */
    @route("/{positional_name}")
    @post
    op me_mood(
      /**
         * A stored mood name; `boop db "select * from mood"` lists them
         */
        @path("positional_name") name?: string,
      /**
         * Drop this session's own mood row, so it inherits again
         */
        @query clear?: boolean,
      /**
         * The session to act on; defaults to the caller
         */
        @query("as") session?: string
    ): void;

  }

  @route("/favorite")
  namespace favorite {
    /**
     * Save one assistant turn from the caller's conversation as a favorite
     */
    @route("/{positional_index}")
    @post
    op me_favorite(
      /**
         * Assistant turn position: -1 is newest, -2 is the one before it
         */
        @path("positional_index") index: int64 = -1,
      /**
         * Why this message is kept
         */
        @query note?: string
    ): void;

  }

}

@route("/config")
namespace config {
  /**
   * Inspect the boop configuration the CLI reads
   */
  @route("/")
  @post
  op config(

  ): void;

  @route("/path")
  namespace path {
    /**
     * Print the resolved config path
     */
    @route("/")
    @post
    op config_path(

    ): void;

  }

  @route("/show")
  namespace show {
    /**
     * Print the loaded config as pretty JSON, including the defaults a missing file produces
     */
    @route("/")
    @post
    op config_show(

    ): void;

  }

  @route("/presets")
  namespace presets {
    /**
     * One row per model preset: name, model, variant, the harness the model spelling names, and which row `default-model-preset` points at
     */
    @route("/")
    @post
    op config_presets(
      @query format: Values4 = Values4.table
    ): void;

  }

}

@route("/agent")
namespace agent {
  /**
   * Freshly synchronize and summarize Boop agent/runtime/activity facts
   */
  @extension("x-clap-hidden", true)
  @route("/")
  @post
  op agent(

  ): void;

  @route("/summary")
  namespace summary {
    /**
     * Synchronize incremental transcript facts, then emit the versioned CASS-compatible Boop agent summary
     */
    @route("/")
    @post
    op agent_summary(
      ...SharedFlags72,
      ...SharedFlags42
    ): void;

  }

  @route("/sessions")
  namespace sessions {
    /**
     * Synchronize transcripts, then emit the native session graph
     */
    @route("/")
    @post
    op agent_sessions(
      /**
         * Restrict session and shell rows to one working directory
         */
        @query cwd?: string,
      /**
         * Include historical and inactive rows
         */
        @query history?: boolean,
      /**
         * Restrict the graph to the family connected to this tmux session or pane
         */
        @query tmux?: string,
      /**
         * Include historical family rows active at or after this Unix timestamp in milliseconds
         */
        @query history_since_ts?: string,
      /**
         * The public graph contract currently emits JSON
         */
        @query format: Values5 = Values5.json,
      ...SharedFlags42
    ): void;

  }

}

@route("/beep")
namespace beep {
  /**
   * Mail a route and block for its answer; also the group that drives harnesses, lanes, agents and processes.
   * 
   * `boop beep <route> <body>` is the one send. `<route>` is a lane, a coordinator, a native, `parent` (the caller's own parent edge) or `children` (every live child of the caller).
   */
  @extension("x-clap-args-conflicts-with-subcommands", true)
  @extension("x-clap-hidden", true)
  @route("/{positional_route}/{positional_body}")
  @post
  op beep(
    /**
       * A registry name, or the `parent` / `children` alias.
       * 
       * Clap cannot mark this required: `subcommand_negates_reqs` does not clear a parent positional once a `beep` subcommand matches, so `beep lane list` would fail on a missing `<ROUTE>`. The dispatch raises clap's own missing-argument error instead.
       */
      @path("positional_route") route?: string,
    /**
       * The message
       */
      @path("positional_body") body?: string,
    /**
       * Who the row is from, when the whoami ladder cannot say
       */
      @query("as") name?: string,
    /**
       * The mail kind the row wears
       */
      @query kind: string = "request",
    /**
       * Seconds to block before exiting 124
       */
      @query timeout: uint64 = 540,
    /**
       * Send and return, instead of blocking for the answer
       */
      @query no_wait?: boolean,
    ...SharedFlags42
  ): void;

  @route("/remind")
  namespace remind {
    /**
     * Expiring recurring reminders to existing routes
     */
    @route("/")
    @post
    op beep_remind(

    ): void;

    @route("/add")
    namespace add {
      /**
       * Persist a named schedule. First delivery is one interval from now
       */
      @route("/{positional_name}/{positional_route}/{positional_body}")
      @post
      op beep_remind_add(
        @path("positional_name") name: string,
        /**
           * Existing explicit route name (no parent/children aliases)
           */
          @path("positional_route") route: string,
        @path("positional_body") body: string,
        /**
           * Positive interval: seconds, or suffix s/m/h (for example 30m)
           */
          @query every: string,
        /**
           * Required exclusive expiry: Unix seconds or RFC3339 with offset
           */
          @query until: string,
        ...SharedFlags42
      ): void;

    }

    @route("/list")
    namespace list {
      /**
       * JSON schedules, outstanding message ids and latest scheduler detail
       */
      @route("/")
      @post
      op beep_remind_list(
        ...SharedFlags42
      ): void;

    }

    @route("/cancel")
    namespace cancel {
      /**
       * Stop future delivery. Already accepted harness work cannot be retracted
       */
      @route("/{positional_name}")
      @post
      op beep_remind_cancel(
        @path("positional_name") name: string,
        ...SharedFlags42
      ): void;

    }

    @route("/run")
    namespace run {
      /**
       * Foreground runner, one per mail dir; restart resumes persisted due times. At most one outstanding occurrence per route; a turn-end or threaded reply releases it. Unknown/crashed delivery stays outstanding (inspect with db). Missed intervals collapse to one. No agents are spawned. Prefer foreground for native doors; --once needs separately persisted completion receipts
       */
      @route("/")
      @post
      op beep_remind_run(
        @query once?: boolean,
        ...SharedFlags42
      ): void;

    }

  }

  @route("/harness")
  namespace harness {
    /**
     * Harness adapters and what each can do
     */
    @route("/")
    @post
    op beep_harness(

    ): void;

    @route("/list")
    namespace list {
      @route("/")
      @post
      op beep_harness_list(

      ): void;

    }

    @route("/get")
    namespace get {
      @route("/{positional_harness}")
      @post
      op beep_harness_get(
        @path("positional_harness") harness: string
      ): void;

    }

  }

  @route("/lane")
  namespace lane {
    /**
     * Lanes: the agents boop spawns and tracks
     */
    @route("/")
    @post
    op beep_lane(

    ): void;

    @route("/list")
    namespace list {
      /**
       * Every lane, with live or dead
       */
      @route("/")
      @post
      op beep_lane_list(
        ...SharedFlags0,
        ...SharedFlags1,
        ...SharedFlags2,
        ...SharedFlags3,
        ...SharedFlags4,
        ...SharedFlags5,
        ...SharedFlags6
      ): void;

    }

    @route("/resume")
    namespace resume {
      /**
       * Continue an agent process group paused by the RSS guard
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_resume(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags6
      ): void;

    }

    @route("/create")
    namespace create {
      /**
       * Make a worktree, spawn the agent, register the route
       */
      @route("/")
      @post
      op beep_lane_create(
        ...SharedFlags7,
        ...SharedFlags8,
        ...SharedFlags9,
        ...SharedFlags10,
        ...SharedFlags11,
        ...SharedFlags12,
        ...SharedFlags13,
        ...SharedFlags14,
        ...SharedFlags15,
        ...SharedFlags16,
        ...SharedFlags17,
        ...SharedFlags18,
        ...SharedFlags19,
        ...SharedFlags20,
        ...SharedFlags21,
        ...SharedFlags22,
        ...SharedFlags23,
        ...SharedFlags24,
        ...SharedFlags25,
        ...SharedFlags26,
        ...SharedFlags27,
        ...SharedFlags28,
        ...SharedFlags29,
        ...SharedFlags30,
        ...SharedFlags31,
        ...SharedFlags32,
        ...SharedFlags33,
        ...SharedFlags6,
        ...SharedFlags34,
        ...SharedFlags35
      ): void;

    }

    @route("/revive")
    namespace revive {
      /**
       * Bring a dead `boop tui` coordinator pane back on its own session. Its route must carry harness, session_id and cwd; a live target refuses
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_revive(
        /**
           * The dead route to revive. Omit for `--dead` or `--list`
           */
          @path("positional_lane") lane?: LaneName,
        ...SharedFlags36,
        ...SharedFlags37,
        ...SharedFlags38,
        ...SharedFlags39,
        ...SharedFlags40,
        ...SharedFlags41,
        ...SharedFlags42
      ): void;

    }

    @route("/get")
    namespace get {
      /**
       * One lane's route and state
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_get(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags43,
        ...SharedFlags42
      ): void;

    }

    @route("/where")
    namespace where {
      /**
       * The lane's worktree path alone, for `cd "$(boop beep lane where x)"`
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_where(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags42
      ): void;

    }

    @route("/patch")
    namespace patch {
      /**
       * Compatibility spelling for rebinding a registered route to an existing pane. Preserves its kind; fresh interactive registration uses agent register
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_patch(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags44,
        ...SharedFlags45,
        ...SharedFlags46,
        ...SharedFlags47,
        ...SharedFlags48,
        ...SharedFlags49,
        ...SharedFlags50,
        ...SharedFlags51,
        ...SharedFlags42
      ): void;

    }

    @route("/delete")
    namespace delete {
      /**
       * Stop a lane and forget it, or bulk-delete by state
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_delete(
        /**
           * One lane: kill its pane and drop its route. Omit for a bulk delete by `--state`
           */
          @path("positional_lane") lane?: LaneName,
        ...SharedFlags52,
        ...SharedFlags53,
        ...SharedFlags54,
        ...SharedFlags55,
        ...SharedFlags42
      ): void;

    }

    @route("/rm")
    namespace rm {
      /**
       * Forget a stopped job's route and keep its worktree and history
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_rm(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags42
      ): void;

    }

    @route("/kill")
    namespace kill {
      /**
       * Stop a lane process and retain its route and result history
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_kill(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags42
      ): void;

    }

    @route("/wait")
    namespace wait {
      /**
       * Wait for a job's result row
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_wait(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags56,
        ...SharedFlags42
      ): void;

    }

    @route("/attach")
    namespace attach {
      /**
       * Attach to a job's tmux session
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_attach(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags42
      ): void;

    }

    @route("/signal")
    namespace signal {
      /**
       * Send a POSIX signal to this job or its direct children
       */
      @route("/{positional_signal}")
      @post
      op beep_lane_signal(
        @path("positional_signal") signal: string,
        ...SharedFlags57,
        ...SharedFlags58,
        ...SharedFlags42
      ): void;

    }

    @route("/prune")
    namespace prune {
      /**
       * Drop routes whose tmux session is gone AND whose recorded pid, if any, is not alive. Refuses when tmux is unreachable
       */
      @route("/")
      @post
      op beep_lane_prune(
        ...SharedFlags59,
        ...SharedFlags42
      ): void;

    }

    @route("/route")
    namespace route {
      /**
       * Which tmux pane and harness session id. Folded (audit 2026-08-25): `beep lane get` prints the same route row
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_route(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags42
      ): void;

    }

    @route("/pane")
    namespace pane {
      /**
       * Show the lane's screen
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_pane(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags60,
        ...SharedFlags61,
        ...SharedFlags42
      ): void;

    }

    @route("/squares")
    namespace squares {
      /**
       * The user/agent squares on the lane's screen: one per visible turn, in screen order, each with the viewport rows it sits on. Reads the pane through the multiplexer and reports the pane's own geometry, so a renderer drawing the right-margin navigator asks one verb for both
       */
      @route("/{positional_lane}")
      @post
      op beep_lane_squares(
        @path("positional_lane") lane: LaneName,
        ...SharedFlags62,
        ...SharedFlags61,
        ...SharedFlags42
      ): void;

    }

    @route("/message")
    namespace message {
      /**
       * The lane's mailbox
       */
      @route("/")
      @post
      op beep_lane_message(

      ): void;

      @route("/list")
      namespace list {
        /**
         * Every mail row addressed to or sent by the lane, oldest first
         */
        @route("/{positional_lane}")
        @post
        op beep_lane_message_list(
          @path("positional_lane") lane: LaneName,
          ...SharedFlags6
        ): void;

      }

    }

    @route("/run")
    namespace run {
      /**
       * Drive one lane conversation. This is what a lane pane runs; a human calls `lane create`, never this. Folded (audit 2026-08-25): the supervisor's entry point, spawned by `lane create`
       */
      @extension("x-clap-hidden", true)
      @route("/")
      @post
      op beep_lane_run(
        ...SharedFlags63,
        ...SharedFlags64,
        ...SharedFlags65,
        ...SharedFlags48,
        ...SharedFlags66,
        ...SharedFlags67,
        ...SharedFlags68,
        ...SharedFlags69,
        ...SharedFlags70,
        ...SharedFlags42
      ): void;

    }

  }

  @route("/agent")
  namespace agent {
    /**
     * Register pane-less coordinators and native subagents
     */
    @route("/")
    @post
    op beep_agent(

    ): void;

    @route("/waterfall")
    namespace waterfall {
      /**
       * One row set of lane lifespans, events, live spans and parent edges
       */
      @route("/")
      @post
      op beep_agent_waterfall(
        /**
           * Inclusive epoch milliseconds, or a duration such as `24h`
           */
          @query("since") ms_duration: int64 | duration,
        /**
           * Restrict rows to a working directory
           */
          @query cwd?: string,
        @query format: Values6 = Values6.json
      ): void;

    }

    @route("/register")
    namespace register {
      /**
       * Register or update a native/coordinator route. Omitted fields are preserved
       */
      @route("/{positional_name}")
      @post
      op beep_agent_register(
        /**
           * The route name. Every boop call this agent makes then carries `--as <name>`: it shares its spawner's process, so no env stamp can name it
           */
          @path("positional_name") name: string,
        /**
           * `native` (a subagent inside a lane or coordinator process) or `coordinator` (an interactive session that owns lanes). Defaults to native for a new route; preserves the kind of an existing route
           */
          @query kind?: string,
        /**
           * The route completion and `boop beep parent` rows go to
           */
          @query parent?: string,
        /**
           * Recorded for this row; a pane-less agent runs no supervisor of its own, so nothing polls on its behalf
           */
          @query on_parent_death: Values0 = Values0.orphan,
        /**
           * The harness a door push addresses. Without it the route is a mailbox, not an address: nothing can push to it
           */
          @query harness?: string,
        /**
           * Observed harness thread/session ID. Required for a pane-less coordinator whose harness exposes no process-local identity
           */
          @query session_id?: string,
        /**
           * Existing tmux pane, window or session to bind. Resolves to a pane ID
           */
          @query tmux?: string,
        /**
           * The directory the agent works in; a hook inbox drains rows here
           */
          @query cwd?: string,
        /**
           * The tree this agent works in. Warmed like a lane spawn's worktree, with the preamble printed here: a native has no injected first turn
           */
          @query worktree?: string,
        ...SharedFlags42
      ): void;

    }

    @route("/done")
    namespace done {
      /**
       * Append a completion row and remove the registry row
       */
      @route("/{positional_name}")
      @post
      op beep_agent_done(
        @path("positional_name") name: string,
        @query rc: uint64 = 0,
        ...SharedFlags42
      ): void;

    }

    @route("/subscribe")
    namespace subscribe {
      /**
       * Receive a lane's commits as pushes. `<lane>` names one lane, `children` every current child plus a wildcard, `'*'` every lane the caller parents
       */
      @route("/{positional_lane}")
      @post
      op beep_agent_subscribe(
        /**
           * A lane, or the `children` / `'*'` alias
           */
          @path("positional_lane") lane: LaneName,
        /**
           * How a commit reaches the subscriber: `door` or `mailbox`
           */
          @query mode: string = "door",
        ...SharedFlags86,
        ...SharedFlags42
      ): void;

    }

    @route("/unsubscribe")
    namespace unsubscribe {
      /**
       * Stop receiving a lane's commit pushes
       */
      @route("/{positional_lane}")
      @post
      op beep_agent_unsubscribe(
        /**
           * A lane, or the `children` / `'*'` alias
           */
          @path("positional_lane") lane: LaneName,
        ...SharedFlags86,
        ...SharedFlags42
      ): void;

    }

  }

  @route("/message")
  namespace message {
    /**
     * Mail across lanes; the one verb `ack` has no other spelling
     */
    @route("/")
    @post
    op beep_message(

    ): void;

    @route("/ack")
    namespace ack {
      /**
       * Mark mail handled, in bulk. Folded (audit 2026-08-25): age-based bulk-mark proves no read and no compliance
       */
      @route("/")
      @post
      op beep_message_ack(
        @query lane?: LaneName,
        @query box?: string,
        @query close_routeless?: boolean,
        @query max_age_days: uint64 = 7,
        ...SharedFlags42
      ): void;

    }

  }

  @route("/fork")
  namespace fork {
    /**
     * Fork a lane off a stored terminal comment: the quoted turns and the note become the brief, the lane runs on `--preset` from the caller's repo, and the link is kept in `agent_turn_comment_fork`. The `join` and `diff` verbs bring the fork back
     */
    @extension("x-clap-args-conflicts-with-subcommands", true)
    @route("/{positional_comment}")
    @post
    op beep_fork(
      /**
         * `comment_id` in `agent_turn_comment`. Required by the bare spawn spelling `boop beep fork <id>`; `join` and `diff` take their own
         */
        @path("positional_comment") comment?: string,
      /**
         * The config preset the lane spawns from: harness, model, effort
         */
        @query preset?: string,
      /**
         * Open the selected harness in its native interactive TUI
         */
        @query interactive?: boolean,
      /**
         * Repo to branch from; defaults to the repo the caller stands in
         */
        @query cwd?: string,
      ...SharedFlags24,
      /**
         * Print the brief path and the lane's `cmd:` line without spawning
         */
        @query dry_run?: boolean,
      ...SharedFlags42
    ): void;

    @route("/join")
    namespace join {
      /**
       * Merge the fork's branch into the caller's repo and deliver the lane's last assistant turn to the fork's parent
       */
      @route("/{positional_comment}")
      @post
      op beep_fork_join(
        /**
           * `comment_id` in `agent_turn_comment`
           */
          @path("positional_comment") comment: string,
        ...SharedFlags87,
        /**
           * Skip the merge; only write and deliver the reply
           */
          @query no_merge?: boolean,
        /**
           * Skip the reply; only merge
           */
          @query no_reply?: boolean,
        /**
           * Print the git command and the recipient, run nothing
           */
          @query dry_run?: boolean,
        ...SharedFlags42
      ): void;

    }

    @route("/diff")
    namespace diff {
      /**
       * Print `git diff <base>..<branch>` for the fork
       */
      @route("/{positional_comment}")
      @post
      op beep_fork_diff(
        /**
           * `comment_id` in `agent_turn_comment`
           */
          @path("positional_comment") comment: string,
        ...SharedFlags87,
        /**
           * Print `--stat` instead of the full diff
           */
          @query stat?: boolean,
        ...SharedFlags42
      ): void;

    }

  }

  @route("/paste")
  namespace paste {
    /**
     * Put a file on the OS pasteboard and press the recipient's paste key in its pane, so a TUI that reads images off the pasteboard (claude, codex: Ctrl+V) takes the picture the way a hand paste would. Text and files the harness cannot read that way land as a quoted path instead
     */
    @route("/{positional_path}")
    @post
    op beep_paste(
      /**
         * The file to paste
         */
        @path("positional_path") path: string,
      /**
         * Recipient route; its registered pane and harness pick the key
         */
        @query route?: string,
      /**
         * A tmux pane or target instead of a route (`%12`, `sess:0.1`)
         */
        @query pane?: string,
      /**
         * Harness at that pane when `--pane` names no route (default claude)
         */
        @query harness?: string,
      /**
         * Type the quoted path even for an image
         */
        @query as_path?: boolean,
      ...SharedFlags42
    ): void;

  }

  @route("/ps")
  namespace ps {
    /**
     * pid, rss, cpu, uptime, child count per live lane
     */
    @route("/{positional_lane}")
    @post
    op beep_ps(
      @path("positional_lane") lane?: LaneName,
      /**
         * Include dead routes (no live process behind the pane)
         */
        @query all?: boolean,
      ...SharedFlags42
    ): void;

  }

  @route("/pstree")
  namespace pstree {
    /**
     * Filesystem-style tree of lanes by parent edge. Folded (audit 2026-08-25): `beep lane list` carries the parent column
     */
    @route("/")
    @post
    op beep_pstree(
      /**
         * Include dead lanes; default is live-only
         */
        @query all?: boolean,
      @query format: Values7 = Values7.text,
      ...SharedFlags42
    ): void;

  }

  @route("/selection")
  namespace selection {
    /**
     * Persistent recipient selection: list live harness panes, tick one route, record focus, or clear the set
     */
    @extension("x-clap-subcommand-required", true)
    @route("/")
    @post
    op beep_selection(
      ...SharedFlags42
    ): void;

    @route("/list")
    namespace list {
      /**
       * List live Boop-controlled panes, most recently focused first
       */
      @route("/")
      @post
      op beep_selection_list(

      ): void;

    }

    @route("/set")
    namespace set {
      /**
       * Change one route's checkbox without replacing other selections
       */
      @route("/{positional_route}")
      @post
      op beep_selection_set(
        @path("positional_route") route: string,
        @query checked?: boolean
      ): void;

    }

    @route("/focus")
    namespace focus {
      /**
       * Record a human focus event for a tmux session or pane
       */
      @route("/{positional_target}")
      @post
      op beep_selection_focus(
        @path("positional_target") target: string,
        @query at?: string
      ): void;

    }

    @route("/clear")
    namespace clear {
      /**
       * Clear the selected recipient set
       */
      @route("/")
      @post
      op beep_selection_clear(

      ): void;

    }

  }

  @route("/shout")
  namespace shout {
    /**
     * One row to every connected agent (live panes and registered pane-less routes), the caller excepted. The stop-gap broadcast
     */
    @route("/{positional_body}")
    @post
    op beep_shout(
      /**
         * The message; omitted sends "stahp what ur doing please"
         */
        @path("positional_body") body?: string,
      /**
         * Send only to the persisted checkbox selection
         */
        @query selected?: boolean,
      /**
         * Explicit recipient routes; repeat for a one-time recipient set
         */
        @query to?: string,
      ...SharedFlags88,
      /**
         * The mail kind the rows wear
         */
        @query kind: string = "hail",
      ...SharedFlags89,
      ...SharedFlags90,
      ...SharedFlags42
    ): void;

  }

  @route("/scream")
  namespace scream {
    /**
     * Interrupt busy agents with one declared harness key before delivering the message. Idle and unknown TUIs take no keys; lanes take cancel rows
     */
    @route("/{positional_body}")
    @post
    op beep_scream(
      /**
         * The message; omitted sends "stop what ur doing check ps"
         */
        @path("positional_body") body?: string,
      ...SharedFlags88,
      ...SharedFlags89,
      ...SharedFlags90,
      ...SharedFlags42
    ): void;

  }

}

@route("/inbox")
namespace inbox {
  /**
   * Mail a claude coordinator reads at a turn boundary: the hook inbox. Folded (door-only-claude-delivery): the hook inbox is a rung the delivery ladder walks on its own, not a verb a caller reaches for. The installed hook still calls `boop inbox drain`, so the group runs
   */
  @extension("x-clap-hidden", true)
  @route("/")
  @post
  op inbox(

  ): void;

  @route("/drain")
  namespace drain {
    /**
     * Print the unread mail addressed to a coordinator and record it as handed over. Silent with an empty inbox, so a hook that runs on every turn costs one line of nothing
     */
    @route("/")
    @post
    op inbox_drain(
      /**
         * Whose inbox to drain; defaults to the identity ladder's answer
         */
        @query("as") name?: string,
      ...SharedFlags71,
      ...SharedFlags42
    ): void;

  }

  @route("/hooks")
  namespace hooks {
    /**
     * Install (or remove) the two drain hooks in <cwd>/.claude/settings.json. Route registration is separate: `boop beep agent register NAME`
     */
    @route("/")
    @post
    op inbox_hooks(
      @query name: string,
      /**
         * The project whose settings carry the hooks; defaults to this dir
         */
        @query cwd?: string,
      @query uninstall?: boolean
    ): void;

  }

}

@route("/remind")
namespace remind {
  /**
   * Print the newest user messages from the caller's tracked conversation
   */
  @extension("x-clap-hidden", true)
  @route("/{positional_count}")
  @post
  op remind(
    /**
       * Number of user messages to print, newest window first in chronology
       */
      @path("positional_count") count: string
  ): void;

}

@route("/shell-init")
namespace shell_init {
  /**
   * Print shell functions that route interactive harnesses through Boop. Folded (one-pane-register-path): `boop tui <harness>` is the spelling
   */
  @extension("x-clap-hidden", true)
  @route("/{positional_shell}")
  @post
  op shell_init(
    @path("positional_shell") shell: Values8
  ): void;

}

@route("/tag")
namespace tag {
  /**
   * The shared tag table: apply tags to any surface, read the recent five back. Search reads `agent_tag` only, never a message body
   */
  @extension("x-clap-hidden", true)
  @route("/")
  @post
  op tag(

  ): void;

  @route("/add")
  namespace add {
    /**
     * Apply one or more tags to a source
     */
    @route("/{positional_tag}")
    @post
    op tag_add(
      @minItems(1)
        @path("positional_tag") tag: string[],
      /**
         * What the tags hang on: favorite:<id>, comment:<id>, lane:<name>, or any spelling the caller keeps. Defaults to the caller's route
         */
        @query source?: string
    ): void;

  }

  @route("/recent")
  namespace recent {
    /**
     * The recently used tags, newest use first
     */
    @route("/")
    @post
    op tag_recent(
      @extension("x-clap-short", "n")
        @query limit: uint64 = 5,
      ...SharedFlags91
    ): void;

  }

  @route("/search")
  namespace search {
    /**
     * Substring match on the tag column; no message body is read
     */
    @route("/{positional_query}")
    @post
    op tag_search(
      @path("positional_query") query: string,
      @extension("x-clap-short", "n")
        @query limit: uint64 = 20,
      ...SharedFlags91
    ): void;

  }

  @route("/list")
  namespace list {
    /**
     * Every tag, most used first
     */
    @route("/")
    @post
    op tag_list(
      ...SharedFlags91
    ): void;

  }

  @route("/of")
  namespace of {
    /**
     * The tags one source carries
     */
    @route("/{positional_source}")
    @post
    op tag_of(
      @path("positional_source") source: string
    ): void;

  }

  @route("/for")
  namespace for {
    /**
     * The tags several sources carry, one read for the batch
     */
    @route("/{positional_source}")
    @post
    op tag_for(
      @minItems(1)
        @path("positional_source") source: string[],
      ...SharedFlags91
    ): void;

  }

  @route("/sources")
  namespace sources {
    /**
     * The sources one tag hangs on
     */
    @route("/{positional_tag}")
    @post
    op tag_sources(
      @path("positional_tag") tag: string
    ): void;

  }

  @route("/rm")
  namespace rm {
    /**
     * Take one tag off one source
     */
    @route("/{positional_tag}")
    @post
    op tag_rm(
      @path("positional_tag") tag: string,
      @query source: string
    ): void;

  }

  @route("/backfill")
  namespace backfill {
    /**
     * Favorite notes become tags, once
     */
    @route("/")
    @post
    op tag_backfill(

    ): void;

  }

}

@route("/tui")
namespace tui {
  /**
   * Launch an ordinary interactive harness TUI and register this pane
   */
  @extension("x-clap-hidden", true)
  @route("/{positional_harness}/{positional_args}")
  @post
  op tui(
    /**
       * Registered harness adapter: claude, codex, kimi, or opencode
       */
      @path("positional_harness") harness: string,
    /**
       * Arguments forwarded to the ordinary harness TUI
       */
      @extension("x-clap-last", true)
      @path("positional_args") args?: string[],
    /**
       * Executable override, for example ccz with the Claude adapter
       */
      @query("bin") executable?: string,
    /**
       * Stable route name for later resumes; refuses an existing live owner
       */
      @query name?: string,
    ...SharedFlags47,
    ...SharedFlags42,
    /**
       * Submit once the native composer is ready (requires tmux)
       */
      @query initial_prompt?: string,
    /**
       * Apply an OpenCode variant before its first prompt
       */
      @query initial_effort?: string
  ): void;

}

@route("/wait")
namespace wait {
  /**
   * Block until mail lands: the reply to <id>, a lane's result row, or the next unread row addressed to you with --me
   */
  @extension("x-clap-hidden", true)
  @route("/{positional_id_or_lane}")
  @post
  op wait(
    /**
       * A message id or lane name. Omit to wait for all child lanes; use --me for the inbox
       */
      @path("positional_id_or_lane") id_or_lane?: MessageId | LaneName,
    /**
       * Wait for the next unread mail addressed to the caller
       */
      @query me?: boolean,
    /**
       * Whose inbox to watch, when the whoami ladder cannot say
       */
      @query("as") name?: string,
    /**
       * Seconds to block before exiting 124
       */
      @query wait_timeout: uint64 = 540,
    ...SharedFlags42
  ): void;

}

@route("/whoami")
namespace whoami {
  /**
   * Report the caller's own identity and which of the two rungs named it
   */
  @extension("x-clap-hidden", true)
  @route("/")
  @post
  op whoami(
    ...SharedFlags85,
    /**
       * Who is calling. The first rung; `--from` is the same flag
       */
      @query("as") name?: string,
    ...SharedFlags42
  ): void;

}

