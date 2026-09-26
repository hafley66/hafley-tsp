use std::path::PathBuf;

use crate::models::inputs::Inputs;

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

#[derive(clap::Args, Debug, Clone)]
pub struct FastArgs {
  #[doc = "Files, directories, or globs; - reads a path list from stdin"]
  pub paths: Vec<String>,
  #[command(flatten)]
  pub inputs: Inputs,
  #[doc = "Write to a new SQLite database instead of stdout"]
  #[arg(long)]
  pub sqlite: Option<PathBuf>,
  #[doc = "Add 1-based line/col beside every span"]
  #[arg(long)]
  pub lines: bool,
}

#[derive(clap::Args, Debug, Clone)]
pub struct SlowArgs {
  #[doc = "Files, directories, or globs; - reads a path list from stdin"]
  pub paths: Vec<String>,
  #[command(flatten)]
  pub inputs: Inputs,
  #[doc = "Write to a new SQLite database instead of stdout"]
  #[arg(long)]
  pub sqlite: Option<PathBuf>,
  #[doc = "Add 1-based line/col beside every span"]
  #[arg(long)]
  pub lines: bool,
  #[doc = "Load this index.scip instead of finding or building one"]
  #[arg(long)]
  pub scip_index: Option<PathBuf>,
  #[doc = "Skip the compiler checkers"]
  #[arg(long)]
  pub no_checker: bool,
  #[doc = "Seconds allowed for one indexer run"]
  #[arg(long)]
  pub scip_timeout: Option<u64>,
}

#[derive(clap::Args, Debug, Clone)]
pub struct ScipArgs {
  #[doc = "Files, directories, or globs; - reads a path list from stdin"]
  pub paths: Vec<String>,
  #[command(flatten)]
  pub inputs: Inputs,
  #[doc = "Write to a new SQLite database instead of stdout"]
  #[arg(long)]
  pub sqlite: Option<PathBuf>,
  #[doc = "Add 1-based line/col beside every span"]
  #[arg(long)]
  pub lines: bool,
  #[doc = "Load this index.scip instead of finding or building one"]
  #[arg(long)]
  pub scip_index: Option<PathBuf>,
  #[doc = "SCIP index cache directory"]
  #[arg(long)]
  pub scip_cache: Option<PathBuf>,
  #[doc = "Seconds allowed for one indexer run"]
  #[arg(long)]
  pub scip_timeout: Option<u64>,
  #[doc = "Run only this language's SCIP indexer"]
  #[arg(long)]
  pub indexer: Option<String>,
  #[doc = "Stream the index records themselves instead of the scip_* relations"]
  #[arg(long)]
  pub raw: bool,
  #[doc = "Only these --raw record kinds (comma-separated)"]
  #[arg(long)]
  pub records: Option<String>,
  #[doc = "Add the source text to each scip_occurrence"]
  #[arg(long)]
  pub occurrence_text: bool,
  #[doc = "Build the index for --raw with the inputs' language indexer"]
  #[arg(long)]
  pub scip_build: bool,
}

#[derive(clap::Args, Debug, Clone)]
pub struct GraphArgs {
  #[doc = "Files, directories, or globs; - reads a path list from stdin"]
  pub paths: Vec<String>,
  #[command(flatten)]
  pub inputs: Inputs,
  #[doc = "Resolved call edges landing on NAME"]
  #[arg(long)]
  pub callers: Option<String>,
  #[doc = "Declarations that reference type NAME"]
  #[arg(long)]
  pub uses: Option<String>,
  #[doc = "Everything NAME reaches along call edges"]
  #[arg(long)]
  pub from: Option<String>,
  #[doc = "Shortest call paths from NAME"]
  #[arg(long)]
  pub call_path: Option<String>,
  #[doc = "Shortest type-reference paths from NAME"]
  #[arg(long)]
  pub type_path: Option<String>,
  #[doc = "Flow paths from BLOB@START:END"]
  #[arg(long)]
  pub flow_path: Option<String>,
  #[doc = "Keep the fact store in a new SQLite database at PATH"]
  #[arg(long)]
  pub sqlite: Option<PathBuf>,
  #[doc = "Walk the SCIP oracle's edges (ryi slow) instead of the syntax resolve"]
  #[arg(long)]
  pub slow: bool,
  #[doc = "Seconds the question may run; past it graph exits 3"]
  #[arg(long, default_value_t = 30)]
  pub timeout: u64,
  #[doc = "Query a committed revision"]
  #[arg(long)]
  pub at: Option<String>,
  #[doc = "Diff the answers against REV"]
  #[arg(long)]
  pub compare: Option<String>,
  #[doc = "Load this index.scip"]
  #[arg(long)]
  pub scip_index: Option<PathBuf>,
  #[doc = "Add rust-analyzer type evidence"]
  #[arg(long)]
  pub rust_checker: bool,
  #[doc = "Add TypeScript checker type evidence"]
  #[arg(long)]
  pub ts_checker: bool,
  #[doc = "Add go/types type evidence"]
  #[arg(long)]
  pub go_checker: bool,
}

#[derive(clap::Args, Debug, Clone)]
pub struct QueryArgs {
  #[doc = "Files, directories, or globs; - reads a path list from stdin"]
  pub paths: Vec<String>,
  #[command(flatten)]
  pub inputs: Inputs,
  #[doc = "Language name (default: from each file's extension)"]
  #[arg(long)]
  pub lang: Option<String>,
  #[doc = "Tree-sitter query text"]
  #[arg(long)]
  pub query: String,
  #[doc = "Expected content digest (one input only)"]
  #[arg(long)]
  pub digest: Option<String>,
  #[doc = "Write to a new SQLite database instead of stdout"]
  #[arg(long)]
  pub sqlite: Option<PathBuf>,
}

#[derive(clap::Args, Debug, Clone)]
pub struct CleaveArgs {
  #[doc = "SRC#ITEM"]
  pub target: String,
  #[doc = "Destination file (created if missing)"]
  pub dest: PathBuf,
  #[doc = "Corpus root (default: git root of SRC)"]
  #[arg(long)]
  pub root: Option<PathBuf>,
  #[doc = "Soopy state root, outside the corpus"]
  #[arg(long)]
  pub state: Option<PathBuf>,
  #[doc = "Also move private helpers only this item uses"]
  #[arg(long)]
  pub drag: bool,
  #[doc = "Apply instead of dry run"]
  #[arg(long)]
  pub commit: bool,
  #[doc = "Command to run after --commit; failure rolls back"]
  #[arg(long)]
  pub verify: Option<String>,
  #[doc = "Report leftover SRC spellings in plain text"]
  #[arg(long)]
  pub text_refs: bool,
  #[doc = "End with one JSON line holding the plan"]
  #[arg(long)]
  pub json: bool,
}

#[derive(clap::Args, Debug, Clone)]
pub struct MoveArgs {
  #[doc = "File to move (omit with --list)"]
  pub old: Option<PathBuf>,
  #[doc = "Destination"]
  pub new: Option<PathBuf>,
  #[doc = "TSV of old<TAB>new rows"]
  #[arg(long)]
  pub list: Option<PathBuf>,
  #[doc = "Corpus root; repeatable"]
  #[arg(long)]
  pub root: Vec<PathBuf>,
  #[doc = "Directory --verify runs in (default: first root)"]
  #[arg(long)]
  pub verify_cwd: Option<PathBuf>,
  #[doc = "Soopy state root, outside the corpus"]
  #[arg(long)]
  pub state: Option<PathBuf>,
  #[doc = "Apply instead of dry run"]
  #[arg(long)]
  pub commit: bool,
  #[doc = "Leave a reexport shim at OLD instead of rewriting importers"]
  #[arg(long)]
  pub shim: bool,
  #[doc = "Move a Rust module's `mod` line instead of adding #[path]"]
  #[arg(long)]
  pub relocate_mod: bool,
  #[doc = "Command to run after --commit; failure rolls back"]
  #[arg(long)]
  pub verify: Option<String>,
  #[doc = "Report leftover old-path spellings in plain text"]
  #[arg(long)]
  pub text_refs: bool,
}

#[derive(clap::Args, Debug, Clone)]
pub struct RenameArgs {
  #[doc = "FILE#OLD (omit with --list)"]
  pub target: Option<String>,
  #[doc = "New name"]
  pub new: Option<String>,
  #[doc = "TSV of anchor<TAB>old<TAB>new rows"]
  #[arg(long)]
  pub list: Option<PathBuf>,
  #[doc = "Corpus root (default: git root of the first anchor)"]
  #[arg(long)]
  pub root: Option<PathBuf>,
  #[doc = "Soopy state root, outside the corpus"]
  #[arg(long)]
  pub state: Option<PathBuf>,
  #[doc = "Byte offset of the declaration when OLD is declared twice"]
  #[arg(long)]
  pub at: Option<u32>,
  #[doc = "Apply instead of dry run"]
  #[arg(long)]
  pub commit: bool,
  #[doc = "Report leftover old-name spellings in plain text"]
  #[arg(long)]
  pub text_refs: bool,
  #[doc = "Cross-check the plan against this SCIP index (report only)"]
  #[arg(long)]
  pub verify_scip: Option<PathBuf>,
  #[doc = "End with one JSON line of abstains"]
  #[arg(long)]
  pub json: bool,
}

#[derive(clap::Args, Debug, Clone)]
pub struct IngestArgs {
  #[doc = "Write to a new SQLite database instead of stdout"]
  #[arg(long)]
  pub sqlite: Option<PathBuf>,
}
