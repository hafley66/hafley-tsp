use std::io::BufRead;
use std::io::Write;

use crate::ops_auto::CleaveArgs;
use crate::ops_auto::FastArgs;
use crate::ops_auto::GraphArgs;
use crate::ops_auto::IngestArgs;
use crate::ops_auto::MoveArgs;
use crate::ops_auto::OpResult;
use crate::ops_auto::QueryArgs;
use crate::ops_auto::RenameArgs;
use crate::ops_auto::ScipArgs;
use crate::ops_auto::SlowArgs;

#[derive(clap::Parser, Debug)]
#[command(name = "ryi", version)]
pub struct Ryi {
  #[command(subcommand)]
  pub cmd: Cmd,
}

#[derive(clap::Subcommand, Debug)]
pub enum Cmd {
  #[doc = "Syntax-only whole-project facts (no compiler)"]
  Fast(FastArgs),
  #[doc = "The SCIP oracle written as fast's tables"]
  Slow(SlowArgs),
  #[doc = "Raw SCIP index rows"]
  Scip(ScipArgs),
  #[doc = "Ask one question of the resolved call/type graph"]
  Graph(GraphArgs),
  #[doc = "Run a tree-sitter query over files"]
  Query(QueryArgs),
  #[doc = "Move one item into another file, with its imports"]
  Cleave(CleaveArgs),
  #[doc = "Move a file and repair every specifier that names it"]
  Move(MoveArgs),
  #[doc = "Rename a symbol and every occurrence bound to it"]
  Rename(RenameArgs),
  #[doc = "Validate and re-emit foreign TSI JSONL"]
  Ingest(IngestArgs),
}

pub fn run(cli: Ryi, input: &mut dyn BufRead, out: &mut dyn Write) -> OpResult<()> {
  match cli.cmd {
          Cmd::Fast(args) => { for item in crate::ops::fast(&args) { write_json(out, &item?)?; } }
          Cmd::Slow(args) => { write_json(out, &crate::ops::slow(&args)?)?; }
          Cmd::Scip(args) => { write_json(out, &crate::ops::scip(&args)?)?; }
          Cmd::Graph(args) => { write_json(out, &crate::ops::graph(&args)?)?; }
          Cmd::Query(args) => { write_json(out, &crate::ops::query(&args)?)?; }
          Cmd::Cleave(args) => { write_json(out, &crate::ops::cleave(&args)?)?; }
          Cmd::Move(args) => { write_json(out, &crate::ops::r#move(&args)?)?; }
          Cmd::Rename(args) => { write_json(out, &crate::ops::rename(&args)?)?; }
          Cmd::Ingest(args) => { write_json(out, &crate::ops::ingest(&args, read_jsonl(&mut *input))?)?; }
  }
  Ok(())
}

pub fn main(cli: Ryi) -> std::process::ExitCode {
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

fn read_jsonl<'a, T: serde::de::DeserializeOwned>(input: &'a mut dyn BufRead) -> impl Iterator<Item = OpResult<T>> + 'a {
    input.lines().map(|line| Ok(serde_json::from_str(&line?)?))
}
