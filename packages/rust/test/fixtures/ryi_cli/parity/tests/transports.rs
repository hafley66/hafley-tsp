use std::io::Cursor;

use axum::body::Body;
use axum::http::{header, Request};
use axum::response::Response;
use clap::Parser;
use http_body_util::BodyExt;
use ryi_cli_parity::cli_auto::{run, Ryi};
use ryi_cli_parity::http_auto::router;
use tower::ServiceExt;

const EDGE: &str = r#"{"owner_path":"a","owner_start":0,"owner_end":5,"target_path":"a","kind":"Field","resolution_origin":"x"}"#;

fn cli(argv: &[&str], stdin: &str) -> String {
    let cli = Ryi::try_parse_from(argv).expect("argv parses");
    let mut out = Vec::new();
    let result = run(cli, &mut Cursor::new(stdin.as_bytes()), &mut out);
    let lines = String::from_utf8(out).unwrap();
    let first = lines.lines().next().map(|l| &l[..l.len().min(40)]).unwrap_or("");
    let end = match result {
        Ok(()) => "complete".to_string(),
        Err(e) => format!("error: {}", e.0),
    };
    format!("cli  {:28} lines={} first={first} | {end}", argv[1..].join(" "), lines.lines().count())
}

fn bin(args: &[&str]) -> String {
    let out = std::process::Command::new(env!("CARGO_BIN_EXE_ryi")).args(args).output().unwrap();
    format!(
        "bin  {:28} lines={} exit={} stderr={}",
        args.join(" "),
        String::from_utf8_lossy(&out.stdout).lines().count(),
        out.status.code().unwrap(),
        String::from_utf8_lossy(&out.stderr).trim(),
    )
}

async fn http(app: axum::Router, uri: &str, content_type: &str, body: &str) -> String {
    let request = Request::post(uri).header(header::CONTENT_TYPE, content_type).body(Body::from(body.to_string())).unwrap();
    let response: Response = app.oneshot(request).await.unwrap();
    let status = response.status().as_u16();
    let ct = response.headers().get(header::CONTENT_TYPE).map(|v| v.to_str().unwrap().to_string()).unwrap_or_default();
    let layer = response.headers().get("x-layer").map(|v| v.to_str().unwrap().to_string()).unwrap_or_default();
    let mut body = response.into_body();
    let mut data = Vec::new();
    let mut end = "complete".to_string();
    while let Some(frame) = body.frame().await {
        match frame {
            Ok(frame) => data.extend_from_slice(frame.data_ref().map(|b| b.as_ref()).unwrap_or_default()),
            Err(e) => {
                end = format!("error: {e}");
                break;
            }
        }
    }
    let text = String::from_utf8(data).unwrap();
    if ct == "application/x-ndjson" {
        let rows: Vec<serde_json::Value> = text.lines().map(|line| serde_json::from_str(line).unwrap()).collect();
        assert!(rows.last().unwrap().get("complete").is_some(), "{uri}: completion row");
        if uri.contains("boom") {
            assert_eq!(rows[rows.len() - 2], serde_json::json!({"error": "boom mid-stream"}));
            assert_eq!(rows.last().unwrap(), &serde_json::json!({"complete": false, "rows": 1}));
        }
    }
    let first = text.lines().next().map(|l| &l[..l.len().min(40)]).unwrap_or("");
    format!("http {uri:28} status={status} ct={ct} layer={layer} lines={} first={first} | {end}", text.lines().count())
}

#[tokio::test]
async fn cli_and_axum_share_ops_streams_and_errors() {
    let tagged = router().layer(axum::middleware::map_response(|mut r: Response| async {
        r.headers_mut().insert("x-layer", "on".parse().unwrap());
        r
    }));
    let rows = vec![
        cli(&["ryi", "fast", "a", "b"], ""),
        cli(&["ryi", "fast", "a", "boom", "b"], ""),
        cli(&["ryi", "fast"], ""),
        cli(&["ryi", "ingest", "/dev/stdin"], &format!("{EDGE}\n{EDGE}\n")),
        cli(&["ryi", "ingest", "/dev/stdin"], &format!("{EDGE}\nnot json\n{EDGE}\n")),
        cli(&["ryi", "cleave", "src/a.rs#X", "src/b.rs", "--commit"], ""),
        bin(&["fast", "a", "b"]),
        bin(&["fast", "a", "boom", "b"]),
        http(router(), "/fast?paths=a&paths=b", "application/json", r#"{"paths":[],"patterns":[],"entry":[]}"#).await,
        http(router(), "/fast?paths=a&paths=boom&paths=b", "application/json", r#"{"paths":[],"patterns":[],"entry":[]}"#).await,
        http(router(), "/fast", "application/json", r#"{"paths":[],"patterns":[],"entry":[]}"#).await,
        http(router(), "/ingest", "application/jsonl", &format!("{EDGE}\n{EDGE}")).await,
        http(router(), "/ingest", "application/jsonl", &format!("{EDGE}\nnot json\n")).await,
        http(tagged, "/cleave?target=x&dest=y&commit=true", "application/json", "").await,
    ];
    let table = rows.join("\n");
    println!("{table}");
    assert_eq!(
        table,
        "\
cli  fast a b                     lines=3 first={\"owner_path\":\"a\",\"owner_name\":\"Owner\",\" | complete
cli  fast a boom b                lines=3 first={\"owner_path\":\"a\",\"owner_name\":\"Owner\",\" | error: boom mid-stream
cli  fast                         lines=1 first={\"complete\":true,\"rows\":0} | complete
cli  ingest /dev/stdin            lines=1 first={\"rows\":2,\"tables\":1} | complete
cli  ingest /dev/stdin            lines=0 first= | error: expected ident at line 1 column 2
cli  cleave src/a.rs#X src/b.rs --commit lines=1 first={\"files\":[\"src/b.rs\"],\"edits\":1,\"committ | complete
bin  fast a b                     lines=3 exit=0 stderr=
bin  fast a boom b                lines=3 exit=1 stderr=error: boom mid-stream
http /fast?paths=a&paths=b        status=200 ct=application/x-ndjson layer= lines=3 first={\"owner_path\":\"a\",\"owner_name\":\"Owner\",\" | complete
http /fast?paths=a&paths=boom&paths=b status=200 ct=application/x-ndjson layer= lines=3 first={\"owner_path\":\"a\",\"owner_name\":\"Owner\",\" | complete
http /fast                        status=200 ct=application/x-ndjson layer= lines=1 first={\"complete\":true,\"rows\":0} | complete
http /ingest                      status=200 ct=application/json layer= lines=1 first={\"rows\":2,\"tables\":1} | complete
http /ingest                      status=500 ct=application/json layer= lines=1 first={\"error\":\"expected ident at line 1 colum | complete
http /cleave?target=x&dest=y&commit=true status=200 ct=application/json layer=on lines=1 first={\"files\":[\"y\"],\"edits\":1,\"committed\":tru | complete"
    );
}
