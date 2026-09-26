// User-owned (the emitter never rewrites this file). Test behavior for the
// transport tests; unused ops keep the generated todo!() body.
use crate::models::call_edge::CallEdge;
use crate::models::edit_plan::EditPlan;
use crate::models::fact_summary::FactSummary;
use crate::models::type_edge::TypeEdge;
use crate::models::type_edge_kind::TypeEdgeKind;
use crate::ops_auto::CleaveArgs;
use crate::ops_auto::DiffArgs;
use crate::ops_auto::FastArgs;
use crate::ops_auto::GraphArgs;
use crate::ops_auto::IngestArgs;
use crate::ops_auto::MoveArgs;
use crate::ops_auto::OpError;
use crate::ops_auto::OpResult;
use crate::ops_auto::QueryArgs;
use crate::ops_auto::RegionArgs;
use crate::ops_auto::RenameArgs;
use crate::ops_auto::ScipArgs;
use crate::ops_auto::SchemaArgs;
use crate::ops_auto::SlowArgs;
use crate::ops_auto::TrailArgs;
use crate::ops_auto::WatchArgs;

pub fn fast(args: &FastArgs) -> impl Iterator<Item = OpResult<TypeEdge>> + '_ {
    let paths = if args.paths.is_empty() { &args.inputs.paths } else { &args.paths };
    paths.iter().map(|path| {
        if path == "boom" {
            return Err(OpError("boom mid-stream".into()));
        }
        Ok(TypeEdge {
            owner_path: path.into(),
            owner_name: Some("Owner".into()),
            owner_start: 0,
            owner_end: 5,
            target_path: path.into(),
            target_name: Some("Target".into()),
            kind: TypeEdgeKind::Field,
            resolution_origin: "same_file".into(),
        })
    })
}

pub fn slow(args: &SlowArgs) -> OpResult<FactSummary> {
    let _ = args;
    todo!()
}

pub fn scip(args: &ScipArgs) -> OpResult<FactSummary> {
    let _ = args;
    todo!()
}

pub fn graph(args: &GraphArgs) -> OpResult<Vec<CallEdge>> {
    let _ = args;
    todo!()
}

pub fn query(args: &QueryArgs) -> OpResult<FactSummary> {
    let _ = args;
    todo!()
}

pub fn cleave(args: &CleaveArgs) -> OpResult<EditPlan> {
    Ok(EditPlan { files: vec![args.dest.clone().unwrap_or_default()], edits: 1, committed: args.commit })
}

pub fn r#move(args: &MoveArgs) -> OpResult<EditPlan> {
    let _ = args;
    todo!()
}

pub fn rename(args: &RenameArgs) -> OpResult<EditPlan> {
    let _ = args;
    todo!()
}

pub fn ingest(args: &IngestArgs, input: impl Iterator<Item = OpResult<TypeEdge>>) -> OpResult<FactSummary> {
    let _ = args;
    let mut rows = 0;
    for edge in input {
        edge?;
        rows += 1;
    }
    Ok(FactSummary { rows, tables: 1 })
}

pub fn region(args: &RegionArgs) -> OpResult<EditPlan> { let _ = args; todo!() }
pub fn watch(args: &WatchArgs) -> OpResult<FactSummary> { let _ = args; todo!() }
pub fn diff(args: &DiffArgs) -> OpResult<FactSummary> { let _ = args; todo!() }
pub fn schema(args: &SchemaArgs) -> OpResult<FactSummary> { let _ = args; todo!() }
pub fn trail(args: &TrailArgs) -> OpResult<FactSummary> { let _ = args; todo!() }
