import "@typespec/http";
import "@typespec/http/streams";
import "./domain.tsp";

using Http;
using Http.Streams;

@service
namespace Ryi;

/** Syntax-only whole-project facts (no compiler) */
@route("/fast")
@post
op fast(
  /** Files, directories, or globs; - reads a path list from stdin */
  @path paths?: string[],

  @bodyRoot inputs: Inputs,

  /** Write to a new SQLite database instead of stdout */
  @query sqlite?: path,

  /** Add 1-based line/col beside every span */
  @query lines?: boolean,
): JsonlStream<TypeEdge>;

/** The SCIP oracle written as fast's tables */
@route("/slow")
@post
op slow(
  /** Files, directories, or globs; - reads a path list from stdin */
  @path paths?: string[],

  @bodyRoot inputs: Inputs,

  /** Write to a new SQLite database instead of stdout */
  @query sqlite?: path,

  /** Add 1-based line/col beside every span */
  @query lines?: boolean,

  /** Load this index.scip instead of finding or building one */
  @query scip_index?: path,

  /** Skip the compiler checkers */
  @query no_checker?: boolean,

  /** Seconds allowed for one indexer run */
  @query scip_timeout?: uint64,
): FactSummary;

/** Raw SCIP index rows */
@route("/scip")
@post
op scip(
  /** Files, directories, or globs; - reads a path list from stdin */
  @path paths?: string[],

  @bodyRoot inputs: Inputs,

  /** Write to a new SQLite database instead of stdout */
  @query sqlite?: path,

  /** Add 1-based line/col beside every span */
  @query lines?: boolean,

  /** Load this index.scip instead of finding or building one */
  @query scip_index?: path,

  /** SCIP index cache directory */
  @query scip_cache?: path,

  /** Seconds allowed for one indexer run */
  @query scip_timeout?: uint64,

  /** Run only this language's SCIP indexer */
  @query indexer?: string,

  /** Stream the index records themselves instead of the scip_* relations */
  @query raw?: boolean,

  /** Only these --raw record kinds (comma-separated) */
  @query records?: string,

  /** Add the source text to each scip_occurrence */
  @query occurrence_text?: boolean,

  /** Build the index for --raw with the inputs' language indexer */
  @query scip_build?: boolean,
): FactSummary;

/** Ask one question of the resolved call/type graph */
@route("/graph")
@post
op graph(
  /** Files, directories, or globs; - reads a path list from stdin */
  @path paths?: string[],

  @bodyRoot inputs: Inputs,

  /** Resolved call edges landing on NAME */
  @query callers?: string,

  /** Declarations that reference type NAME */
  @query uses?: string,

  /** Everything NAME reaches along call edges */
  @query from?: string,

  /** Shortest call paths from NAME */
  @query call_path?: string,

  /** Shortest type-reference paths from NAME */
  @query type_path?: string,

  /** Flow paths from BLOB\@START:END */
  @query flow_path?: string,

  /** Keep the fact store in a new SQLite database at PATH */
  @query sqlite?: path,

  /** Walk the SCIP oracle's edges (ryi slow) instead of the syntax resolve */
  @query slow?: boolean,

  /** Seconds the question may run; past it graph exits 3 */
  @query timeout?: uint64 = 30,

  /** Query a committed revision */
  @query at?: string,

  /** Diff the answers against REV */
  @query compare?: string,

  /** Load this index.scip */
  @query scip_index?: path,

  /** Add rust-analyzer type evidence */
  @query rust_checker?: boolean,

  /** Add TypeScript checker type evidence */
  @query ts_checker?: boolean,

  /** Add go/types type evidence */
  @query go_checker?: boolean,
): CallEdge[];

/** Run a tree-sitter query over files */
@route("/query")
@post
op query(
  /** Files, directories, or globs; - reads a path list from stdin */
  @path paths?: string[],

  @bodyRoot inputs: Inputs,

  /** Language name (default: from each file's extension) */
  @query lang?: string,

  /** Tree-sitter query text */
  @query query: string,

  /** Expected content digest (one input only) */
  @query digest?: string,

  /** Write to a new SQLite database instead of stdout */
  @query sqlite?: path,
): FactSummary;

/** Move one item into another file, with its imports */
@route("/cleave")
@post
op cleave(
  /** SRC#ITEM */
  @path target: string,

  /** Destination file (created if missing) */
  @path dest: path,

  /** Corpus root (default: git root of SRC) */
  @query root?: path,

  /** Soopy state root, outside the corpus */
  @query state?: path,

  /** Also move private helpers only this item uses */
  @query drag?: boolean,

  /** Apply instead of dry run */
  @query commit?: boolean,

  /** Command to run after --commit; failure rolls back */
  @query verify?: string,

  /** Report leftover SRC spellings in plain text */
  @query text_refs?: boolean,

  /** End with one JSON line holding the plan */
  @query json?: boolean,
): EditPlan;

/** Move a file and repair every specifier that names it */
@route("/move")
@post
op `move`(
  /** File to move (omit with --list) */
  @path old?: path,

  /** Destination */
  @path new?: path,

  /** TSV of old<TAB>new rows */
  @query list?: path,

  /** Corpus root; repeatable */
  @query root?: path[],

  /** Directory --verify runs in (default: first root) */
  @query verify_cwd?: path,

  /** Soopy state root, outside the corpus */
  @query state?: path,

  /** Apply instead of dry run */
  @query commit?: boolean,

  /** Leave a reexport shim at OLD instead of rewriting importers */
  @query shim?: boolean,

  /** Move a Rust module's `mod` line instead of adding #[path] */
  @query relocate_mod?: boolean,

  /** Command to run after --commit; failure rolls back */
  @query verify?: string,

  /** Report leftover old-path spellings in plain text */
  @query text_refs?: boolean,
): EditPlan;

/** Rename a symbol and every occurrence bound to it */
@route("/rename")
@post
op rename(
  /** FILE#OLD (omit with --list) */
  @path target?: string,

  /** New name */
  @path new?: string,

  /** TSV of anchor<TAB>old<TAB>new rows */
  @query list?: path,

  /** Corpus root (default: git root of the first anchor) */
  @query root?: path,

  /** Soopy state root, outside the corpus */
  @query state?: path,

  /** Byte offset of the declaration when OLD is declared twice */
  @query at?: uint32,

  /** Apply instead of dry run */
  @query commit?: boolean,

  /** Report leftover old-name spellings in plain text */
  @query text_refs?: boolean,

  /** Cross-check the plan against this SCIP index (report only) */
  @query verify_scip?: path,

  /** End with one JSON line of abstains */
  @query json?: boolean,
): EditPlan;

/** Validate and re-emit foreign TSI JSONL */
@route("/ingest")
@post
op ingest(
  @bodyRoot input: JsonlStream<TypeEdge>,

  /** Write to a new SQLite database instead of stdout */
  @query sqlite?: path,
): FactSummary;
