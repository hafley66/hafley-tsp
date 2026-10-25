// Compiled against the crate 08_wire-gaps.test.tsx generates from wire.tsp:
// JSON shapes equal the openapi3 schemas, the router serves a trait impl through
// axum State, and @error models answer with their @statusCode.

use std::sync::Arc;

use axum::body::Body;
use axum::http::Request;
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use wire_gaps::_9_wire::http_auto::router;
use wire_gaps::_9_wire::models::cell::Cell;
use wire_gaps::_9_wire::models::change::Change;
use wire_gaps::_9_wire::models::circle::Circle;
use wire_gaps::_9_wire::models::col_type::ColType;
use wire_gaps::_9_wire::models::column::Column;
use wire_gaps::_9_wire::models::column_mode::ColumnMode;
use wire_gaps::_9_wire::models::delta::Delta;
use wire_gaps::_9_wire::models::flat::Flat;
use wire_gaps::_9_wire::models::missing::Missing;
use wire_gaps::_9_wire::models::query_error::QueryError;
use wire_gaps::_9_wire::models::shape::Shape;
use wire_gaps::_9_wire::models::table::Table;
use wire_gaps::_9_wire::ops_auto::{CommitArgs, OpError, OpResult, PlanArgs, QueryArgs, Wire};

struct Fixed;

impl Wire for Fixed {
    fn commit(&self, args: &CommitArgs) -> OpResult<Delta> {
        Ok(Delta { event: 7, changes: args.changes.clone() })
    }
    fn query(&self, args: &QueryArgs) -> OpResult<Table> {
        match args.request.sql.as_str() {
            "bad" => Err(QueryError { message: "bad sql".into() }.into()),
            "missing" => Err(Missing { what: "edge".into() }.into()),
            "boom" => Err(OpError::Internal("boom".into())),
            _ => Ok(Table {
                columns: vec!["a".into()],
                rows: vec![vec![Cell::text("x".into()), Cell::int(3)]],
                shapes: vec![Shape::circle(Circle { radius: 1.0 })],
                flat: vec![Flat::circle(Circle { radius: 2.0 })],
            }),
        }
    }
    fn plan(&self, _args: &PlanArgs) -> OpResult<Vec<Column>> {
        Ok(vec![Column { name: "a".into(), r#type: ColType::Text, mode: ColumnMode::slow_ish, note: None }])
    }
}

#[test]
fn json_shapes_match_openapi3() {
    let table = Table {
        columns: vec!["a".into()],
        rows: vec![vec![Cell::text("x".into()), Cell::int(3)]],
        shapes: vec![Shape::circle(Circle { radius: 1.0 })],
        flat: vec![Flat::circle(Circle { radius: 2.0 })],
    };
    let value = serde_json::to_value(&table).unwrap();
    assert_eq!(
        value,
        json!({
            "columns": ["a"],
            "rows": [["x", 3]],
            "shapes": [{ "kind": "circle", "value": { "radius": 1.0 } }],
            "flat": [{ "kind": "circle", "radius": 2.0 }],
        })
    );
    let back: Table = serde_json::from_value(value.clone()).unwrap();
    assert_eq!(serde_json::to_value(&back).unwrap(), value);

    let column = json!({ "name": "a", "type": "Text", "mode": "slow-ish", "note": null });
    let parsed: Column = serde_json::from_value(column.clone()).unwrap();
    assert_eq!(parsed.mode, ColumnMode::slow_ish);
    assert_eq!(serde_json::to_value(&parsed).unwrap(), column);

    let change: Change = serde_json::from_value(json!({ "rel": "edge", "cells": ["a", 2], "diff": 1 })).unwrap();
    assert!(matches!(change.cells[..], [Cell::text(ref t), Cell::int(2)] if t == "a"));
}

async fn call(method: &str, path: &str, body: Option<Value>) -> (u16, Value) {
    let app = router(Arc::new(Fixed));
    let request = Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .body(body.map(|b| Body::from(b.to_string())).unwrap_or_else(Body::empty))
        .unwrap();
    let response = app.oneshot(request).await.unwrap();
    let status = response.status().as_u16();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&bytes).unwrap())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn router_serves_trait_state_and_maps_status_codes() {
    let mut seen = Vec::new();
    for (method, path, body) in [
        ("POST", "/query", Some(json!({ "sql": "bad" }))),
        ("POST", "/query", Some(json!({ "sql": "missing" }))),
        ("POST", "/query", Some(json!({ "sql": "boom" }))),
        ("GET", "/plan", None),
        ("POST", "/commit", Some(json!([{ "rel": "edge", "cells": [1], "diff": -1 }]))),
    ] {
        let (status, value) = call(method, path, body).await;
        seen.push(json!({ "route": format!("{method} {path}"), "status": status, "body": value }));
    }
    assert_eq!(
        Value::Array(seen),
        json!([
            { "route": "POST /query", "status": 400, "body": { "message": "bad sql" } },
            { "route": "POST /query", "status": 404, "body": { "what": "edge" } },
            { "route": "POST /query", "status": 500, "body": { "error": "boom" } },
            { "route": "GET /plan", "status": 200, "body": [{ "name": "a", "type": "Text", "mode": "slow-ish", "note": null }] },
            { "route": "POST /commit", "status": 200, "body": { "event": 7, "changes": [{ "rel": "edge", "cells": [1], "diff": -1 }] } },
        ])
    );
}
