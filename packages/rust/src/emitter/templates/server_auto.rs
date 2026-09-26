// Generated from the __SERVICE__ HTTP operations and @daemon options.
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use axum::body::{Body, Bytes};
use axum::extract::State;
use axum::http::{HeaderMap, Request as HttpRequest, StatusCode};
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderName, HeaderValue};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Json;
use base64::Engine as _;
use fs4::fs_std::FileExt as _;
use futures_util::StreamExt as _;
use tokio_util::sync::CancellationToken;

use crate::daemon_auto::Request;
use crate::ops_auto::*;

fn error_status(code: i32) -> StatusCode {
    match code {
        2 => StatusCode::BAD_REQUEST,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

fn error_response(error: OpError) -> Response {
    let code = error.1;
    let mut row = serde_json::to_vec(&serde_json::json!({"error": error.0, "code": error.1})).expect("error row serializes");
    row.push(b'\n');
    let mut response = (error_status(code), [(CONTENT_TYPE, "application/x-ndjson")], row).into_response();
    response.headers_mut().insert(HeaderName::from_static("x-__BIN__-exit-code"), HeaderValue::from_str(&code.to_string()).expect("exit code header"));
    response
}

fn bad_request(message: String) -> Response { error_response(OpError(message, 2)) }

async fn jsonl_response(items: Box<dyn Iterator<Item = OpResult<Vec<u8>>> + Send>) -> Response {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<(Option<i32>, Bytes)>(64);
    tokio::task::spawn_blocking(move || {
        let mut failed = false;
        for item in items {
            let (bytes, code) = match item {
                Ok(bytes) => (bytes, None),
                Err(error) => {
                    failed = true;
                    let mut line = serde_json::to_vec(&serde_json::json!({"error": error.0, "code": error.1})).expect("error row serializes");
                    line.push(b'\n');
                    (line, Some(error.1))
                }
            };
            if tx.blocking_send((code, Bytes::from(bytes))).is_err() || failed { return; }
        }
    });
    let Some(first) = rx.recv().await else { return (StatusCode::OK, [(CONTENT_TYPE, "application/x-ndjson")], Body::empty()).into_response(); };
    let status = first.0.map_or(StatusCode::OK, error_status);
    let stream = futures_util::stream::once(async move { Ok::<Bytes, std::io::Error>(first.1) })
        .chain(futures_util::stream::unfold(rx, |mut rx| async move {
            rx.recv().await.map(|(_, bytes)| (Ok::<Bytes, std::io::Error>(bytes), rx))
        }));
    (status, [(CONTENT_TYPE, "application/x-ndjson")], Body::from_stream(stream)).into_response()
}

async fn raw_response(out: OpResult<Vec<u8>>) -> Response {
    match out {
        Ok(bytes) => ([(CONTENT_TYPE, "application/x-ndjson")], bytes).into_response(),
        Err(error) => error_response(error),
    }
}

macro_rules! stream_handler {
    ($handler:ident, $verb:literal, $args:ty, $op:ident) => {
        async fn $handler(Json(request): Json<Request>) -> Response {
            let root = request.request_root.clone();
            let args: $args = match request.decode($verb) { Ok(args) => args, Err(error) => return bad_request(error) };
            let items = crate::ops::with_request_root(root, || crate::ops::$op(&args));
            jsonl_response(items).await
        }
    };
}
macro_rules! raw_handler {
    ($handler:ident, $verb:literal, $args:ty, $op:ident) => {
        async fn $handler(Json(request): Json<Request>) -> Response {
            let root = request.request_root.clone();
            let args: $args = match request.decode($verb) { Ok(args) => args, Err(error) => return bad_request(error) };
            let out = tokio::task::spawn_blocking(move || crate::ops::with_request_root(root, || crate::ops::$op(&args))).await;
            match out { Ok(out) => raw_response(out).await, Err(error) => error_response(OpError(error.to_string(), 1)) }
        }
    };
}

// __HANDLERS__

fn jsonl_input<T: serde::de::DeserializeOwned + Send + 'static>(body: Body) -> impl Iterator<Item = OpResult<T>> + Send {
    let (tx, mut rx) = tokio::sync::mpsc::channel(64);
    tokio::spawn(async move {
        let chunks = body.into_data_stream().map(|chunk| chunk.map_err(std::io::Error::other));
        let reader = tokio_util::io::StreamReader::new(chunks);
        let mut lines = tokio_util::codec::FramedRead::new(reader, tokio_util::codec::LinesCodec::new());
        while let Some(line) = lines.next().await {
            let value = line.map_err(OpError::from).and_then(|line| serde_json::from_str(&line).map_err(OpError::from));
            if tx.send(value).await.is_err() { return; }
        }
    });
    std::iter::from_fn(move || rx.blocking_recv())
}

// __INPUT_HANDLERS__

#[derive(Clone)]
struct DaemonState { last: Arc<Mutex<Instant>>, shutdown: CancellationToken, stamp: Arc<str> }

async fn touch(State(state): State<DaemonState>, request: HttpRequest<Body>, next: Next) -> Response {
    *state.last.lock().unwrap() = Instant::now();
    next.run(request).await
}

async fn handshake(State(state): State<DaemonState>, headers: HeaderMap) -> StatusCode {
    if crate::daemon_auto::HANDSHAKE && headers.get("x-__BIN__-build").and_then(|value| value.to_str().ok()) != Some(state.stamp.as_ref()) {
        state.shutdown.cancel();
        return StatusCode::CONFLICT;
    }
    StatusCode::OK
}

fn router(state: DaemonState) -> axum::Router {
    axum::Router::new()
        .route("/__handshake", get(handshake))
        // __ROUTES__
        .layer(axum::middleware::from_fn_with_state(state.clone(), touch))
        .with_state(state)
}

pub fn daemon() -> Result<(), Box<dyn std::error::Error>> {
    daemonize::Daemonize::new().start()?;
    let cache = crate::daemon_auto::cache_dir()?;
    std::fs::create_dir_all(&cache)?;
    #[cfg(unix)] {
        use std::os::unix::fs::PermissionsExt as _;
        std::fs::set_permissions(&cache, std::fs::Permissions::from_mode(0o700))?;
    }
    let lock = std::fs::OpenOptions::new().create(true).read(true).write(true).open(cache.join("__BIN__.lock"))?;
    match lock.try_lock_exclusive() {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => return Ok(()),
        Err(error) => return Err(error.into()),
    }
    let socket = crate::daemon_auto::socket_path()?;
    if socket.exists() { std::fs::remove_file(&socket)?; }
    let stamp: Arc<str> = crate::daemon_auto::executable_stamp(&std::env::current_exe()?)?.into();
    let runtime = tokio::runtime::Builder::new_multi_thread().enable_all().build()?;
    let result = runtime.block_on(async {
        let listener = tokio::net::UnixListener::bind(&socket)?;
        let state = DaemonState { last: Arc::new(Mutex::new(Instant::now())), shutdown: CancellationToken::new(), stamp };
        let idle_state = state.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(1)).await;
                if idle_state.last.lock().unwrap().elapsed() >= Duration::from_secs(crate::daemon_auto::IDLE_SECS) {
                    idle_state.shutdown.cancel();
                    break;
                }
            }
        });
        let shutdown = state.shutdown.clone();
        axum::serve(listener, router(state)).with_graceful_shutdown(async move { shutdown.cancelled().await }).await?;
        Ok::<(), Box<dyn std::error::Error>>(())
    });
    let _ = std::fs::remove_file(socket);
    result
}
