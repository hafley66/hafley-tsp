import { readFileSync } from "node:fs";
import { SourceFile } from "../components/3_files/0_SourceFile.js";
import type { ModelDef, ModelProperty, ServiceDef, TypeDef } from "./00_types.js";
import { pascalCase, type OpPlan } from "./04_ops-plan.js";

function template(name: string): string {
  return readFileSync(new URL(`../../src/emitter/templates/${name}.rs`, import.meta.url), "utf8");
}

function stdinPathFields(op: OpPlan, types: TypeDef[]): string[] {
  const models = new Map(types.filter((type): type is ModelDef => type.kind === "model").map(type => [type.name, type]));
  const defaulted = new Set<string>();
  const positional = new Set<string>();
  const visit = (property: ModelProperty) => {
    if (property.cli?.skip) return;
    if (property.type.kind === "model") {
      for (const nested of models.get(property.type.name)?.properties ?? []) visit(nested);
      return;
    }
    const type = property.type.kind === "array" ? property.type.element : property.type;
    if (type.kind === "scalar" && (type.alias === "path" || type.name === "path")) {
      if (property.default === "-") defaulted.add(property.name);
      if (property.cli?.positional) positional.add(property.name);
    }
  };
  op.op.params.forEach(visit);
  return [...(defaulted.size ? defaulted : positional)];
}

function daemonFile(service: ServiceDef, plans: OpPlan[], types: TypeDef[], bin: string): string {
  const serverBin = service.daemon!.serverBin ?? `${bin}-server`;
  const stdinPaths = plans.map(plan => `        ${JSON.stringify(plan.op.name)} => &[${(plan.input?.param.streamFormat === "raw" ? stdinPathFields(plan, types) : []).map(name => JSON.stringify(name)).join(", ")}],`).join("\n");
  return template("daemon_auto")
    .replaceAll("__BIN__", bin)
    .replaceAll("__SERVER_BIN__", serverBin)
    .replace("__SERVICE__", service.name)
    .replace("__IDLE_SECS__", String(service.daemon!.idleSecs))
    .replace("__HANDSHAKE__", String(service.daemon!.handshake))
    .replace("__IDLE_ENV__", `${bin.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_IDLE_SECS`)
    .replace("__HANDSHAKE_ENV__", `${bin.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_HANDSHAKE`)
    .replace("        // __STDIN_PATH_ARMS__", stdinPaths);
}

function clientFile(service: ServiceDef, plans: OpPlan[], bin: string): string {
  const root = service.rootArgs && plans.find(plan => plan.fields.some(field => field.param.type.kind === "model" && field.param.type.name === service.rootArgs));
  if (service.rootArgs && !root) throw new Error(`root args ${service.rootArgs} have no operation`);
  const arms = [
    ...(root ? [`None => (${JSON.stringify(root.op.name)}, serde_json::to_value(&cli.file)?),`] : []),
    ...plans.filter(plan => plan !== root).map(plan => `${root ? "Some(" : ""}Cmd::${plan.variant}${plan.fields.length ? "(args)" : ""}${root ? ")" : ""} => (${JSON.stringify(plan.op.name)}, ${plan.fields.length ? "serde_json::to_value(args)?" : "serde_json::json!({})"}),`),
  ].map(line => `        ${line}`).join("\n");
  const rawInputs = plans.filter(plan => plan.input?.param.streamFormat === "raw").map(plan => JSON.stringify(plan.op.name));
  const jsonlInputs = plans.filter(plan => plan.input?.param.streamFormat === "jsonl").map(plan => JSON.stringify(plan.op.name));
  const rawInputMatch = rawInputs.length ? `matches!(verb, ${rawInputs.join(" | ")})` : "false";
  const jsonlInputMatch = jsonlInputs.length ? `matches!(verb, ${jsonlInputs.join(" | ")})` : "false";
  const rawPlans = plans.filter(plan => plan.input?.param.streamFormat === "raw");
  const contentTypes = new Set(rawPlans.map(plan => plan.input?.param.streamContentType ?? "application/octet-stream"));
  const rawContentType = contentTypes.size === 1 ? JSON.stringify([...contentTypes][0])
    : `match verb { ${rawPlans.map(plan => `${JSON.stringify(plan.op.name)} => ${JSON.stringify(plan.input?.param.streamContentType ?? "application/octet-stream")},`).join(" ")} _ => "application/octet-stream" }`;
  const jsonlBranch = jsonlInputs.length ? `} else if ${jsonlInputMatch} {
        let metadata = base64::engine::general_purpose::STANDARD.encode(json.as_bytes());
        let content_type = match verb { ${plans.filter(plan => plan.input?.param.streamFormat === "jsonl").map(plan => `${JSON.stringify(plan.op.name)} => ${JSON.stringify(plan.input?.param.streamContentType ?? "application/jsonl")},`).join(" ")} _ => "application/jsonl" };
        builder = builder.header("x-${bin}-request", metadata).header("content-type", content_type);
        if std::io::stdin().is_terminal() {
            empty_body()
        } else {
            let stream = ReaderStream::new(tokio::io::stdin()).map(|chunk| chunk.map(Frame::data));
            StreamBody::new(stream).boxed_unsync()
        }
    ` : "";
  const methods = plans.filter(plan => plan.op.verb !== "post")
    .map(plan => `        ${JSON.stringify(plan.op.name)} => Method::${plan.op.verb.toUpperCase()},`).join("\n");
  const paths = plans.map(plan => `        ${JSON.stringify(plan.op.name)} => ${JSON.stringify(plan.op.path)},`).join("\n");
  return template("client_auto")
    .replaceAll("__BIN__", bin)
    .replaceAll("__CLI_TYPE__", pascalCase(bin))
    .replace("        // __COMMAND_ARMS__", arms)
    .replace("        // __METHOD_ARMS__", methods)
    .replace("        // __PATH_ARMS__", paths)
    .replace("__RAW_INPUT_MATCH__", rawInputMatch)
    .replace("__RAW_CONTENT_TYPE__", rawContentType)
    .replace("    // __JSONL_INPUT_BRANCH__\n", jsonlBranch ? `    ${jsonlBranch}\n` : "")
    .replace("use std::io::IsTerminal as _;", jsonlInputs.length ? "use std::io::IsTerminal as _;" : "");
}

function inputHandler(plan: OpPlan, bin: string): string {
  const raw = plan.input?.param.streamFormat === "raw";
  const response = plan.returnsStream ? "jsonl_response(out, diagnostics).await" : "raw_response(out, &diagnostics).await";
  const header = `x-${bin}-request`;
  const decode = raw ? `let (json, input) = if let Some(encoded) = headers.get(${JSON.stringify(header)}) {
        let json = match base64::engine::general_purpose::STANDARD.decode(encoded.as_bytes()) {
            Ok(json) => json,
            Err(error) => return bad_request(error.to_string()),
        };
        let staged = match tempfile::NamedTempFile::new() { Ok(file) => file, Err(error) => return bad_request(error.to_string()) };
        let file = match staged.reopen() { Ok(file) => file, Err(error) => return bad_request(error.to_string()) };
        let mut file = tokio::fs::File::from_std(file);
        let chunks = body.into_data_stream().map(|chunk| chunk.map_err(std::io::Error::other));
        let mut reader = tokio_util::io::StreamReader::new(chunks);
        if let Err(error) = tokio::io::copy(&mut reader, &mut file).await { return bad_request(error.to_string()); }
        if let Err(error) = file.flush().await { return bad_request(error.to_string()); }
        (json, Some(Arc::new(staged)))
    } else {
        let json = match axum::body::to_bytes(body, 1024 * 1024).await {
            Ok(json) => json.to_vec(),
            Err(error) => return bad_request(error.to_string()),
        };
        (json, None)
    };` : `let encoded = match headers.get(${JSON.stringify(header)}).and_then(|header| header.to_str().ok()) {
        Some(encoded) => encoded,
        None => return bad_request(${JSON.stringify(`missing ${header}`)}.into()),
    };
    let json = match base64::engine::general_purpose::STANDARD.decode(encoded) {
        Ok(json) => json,
        Err(error) => return bad_request(error.to_string()),
    };`;
  return `async fn ${plan.fn}(headers: HeaderMap, body: Body) -> Response {
    ${decode}
    let request: Request = match serde_json::from_slice(&json) {
        Ok(request) => request,
        Err(error) => return bad_request(error.to_string()),
    };
    let root = request.request_root.clone();
    tracing::Span::current().record("request_root", &tracing::field::display(root.display()));
    let args: ${plan.argsName} = match request.decode() { Ok(args) => args, Err(error) => return bad_request(error) };
    ${raw ? "" : "let input = jsonl_input(body);"}
    let diagnostics = Arc::new(Mutex::new(Vec::new()));
    let captured = diagnostics.clone();
    let out = tokio::task::spawn_blocking(move || crate::ops::with_request_context(root, Some(captured), || ${raw ? `crate::ops::with_request_input(input, || crate::ops::${plan.fn}(&args))` : `crate::ops::${plan.fn}(&args, input)`})).await;
    match out { Ok(out) => ${response}, Err(error) => error_response(OpError(error.to_string(), 1)) }
}`;
}

function serverFile(service: ServiceDef, plans: OpPlan[], bin: string): string {
  const handlers = plans.filter(plan => !plan.input).map(plan =>
    `${plan.returnsStream ? "stream_handler" : "raw_handler"}!(${plan.fn}, ${JSON.stringify(plan.op.name)}, ${plan.argsName}, ${plan.fn});`
  ).join("\n");
  const inputHandlers = plans.filter(plan => plan.input).map(plan => inputHandler(plan, bin)).join("\n\n");
  const routes = plans.map(plan => `        .route(${JSON.stringify(plan.op.path)}, ${plan.op.verb}(${plan.fn}))`).join("\n");
  const verbArms = plans.map(plan => `        ${JSON.stringify(plan.op.path)} => ${JSON.stringify(plan.op.name)},`).join("\n");
  return template("server_auto")
    .replace("__SERVICE__", service.name)
    .replaceAll("__SERVER_BIN__", service.daemon!.serverBin ?? `${bin}-server`)
    .replaceAll("__BIN__", bin)
    .replaceAll("__REQUEST_HEADER__", `x-${bin}-request`)
    .replace("// __HANDLERS__", handlers)
    .replace("// __INPUT_HANDLERS__", inputHandlers)
    .replace(/\/\/ __JSONL_INPUT_START__\n([\s\S]*?)\/\/ __JSONL_INPUT_END__\n/, (_match, helper) =>
      plans.some(plan => plan.input && plan.input.param.streamFormat !== "raw") ? helper : "")
    .replace("        // __VERB_ARMS__", verbArms)
    .replace("        // __ROUTES__", routes);
}

export function DaemonFiles(props: { service: ServiceDef; plans: OpPlan[]; types: TypeDef[]; bin: string }) {
  return <>
    <SourceFile path="daemon_auto.rs">{daemonFile(props.service, props.plans, props.types, props.bin)}</SourceFile>
    <SourceFile path="client_auto.rs">{clientFile(props.service, props.plans, props.bin)}</SourceFile>
    <SourceFile path="server_auto.rs">{serverFile(props.service, props.plans, props.bin)}</SourceFile>
  </>;
}
