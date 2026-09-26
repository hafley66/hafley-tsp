import { readFileSync } from "node:fs";
import { SourceFile } from "../components/3_files/0_SourceFile.js";
import type { ModelDef, ModelProperty, ServiceDef, TypeDef } from "./00_types.js";
import { pascalCase, type OpPlan } from "./04_ops-plan.js";

function template(name: string): string {
  return readFileSync(new URL(`../../src/emitter/templates/${name}.rs`, import.meta.url), "utf8");
}

function pathFields(op: OpPlan, types: TypeDef[]): string[] {
  const models = new Map(types.filter((type): type is ModelDef => type.kind === "model").map(type => [type.name, type]));
  const names = new Set<string>();
  const visit = (property: ModelProperty) => {
    if (property.cli?.skip) return;
    if (property.type.kind === "model") {
      for (const nested of models.get(property.type.name)?.properties ?? []) visit(nested);
      return;
    }
    const type = property.type.kind === "array" ? property.type.element : property.type;
    if (type.kind === "scalar" && (type.alias === "path" || type.name === "path")) {
      names.add(property.name);
    }
  };
  op.op.params.forEach(visit);
  return [...names];
}

function daemonFile(service: ServiceDef, plans: OpPlan[], types: TypeDef[], bin: string): string {
  const paths = plans.map(plan => `        ${JSON.stringify(plan.op.name)} => &[${pathFields(plan, types).map(name => JSON.stringify(name)).join(", ")}],`).join("\n");
  return template("daemon_auto")
    .replaceAll("__BIN__", bin)
    .replace("__SERVICE__", service.name)
    .replace("__IDLE_SECS__", String(service.daemon!.idleSecs))
    .replace("__HANDSHAKE__", String(service.daemon!.handshake))
    .replace("__IDLE_ENV__", `${bin.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_IDLE_SECS`)
    .replace("__HANDSHAKE_ENV__", `${bin.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_HANDSHAKE`)
    .replace("        // __PATH_ARMS__", paths);
}

function clientFile(service: ServiceDef, plans: OpPlan[], bin: string): string {
  const root = service.rootArgs && plans.find(plan => plan.fields.some(field => field.param.type.kind === "model" && field.param.type.name === service.rootArgs));
  if (service.rootArgs && !root) throw new Error(`root args ${service.rootArgs} have no operation`);
  const arms = [
    ...(root ? [`None => (${JSON.stringify(root.op.name)}, serde_json::to_value(&cli.file)?),`] : []),
    ...plans.filter(plan => plan !== root).map(plan => `${root ? "Some(" : ""}Cmd::${plan.variant}${plan.fields.length ? "(args)" : ""}${root ? ")" : ""} => (${JSON.stringify(plan.op.name)}, ${plan.fields.length ? "serde_json::to_value(args)?" : "serde_json::json!({})"}),`),
  ].map(line => `        ${line}`).join("\n");
  const inputs = plans.filter(plan => plan.input).map(plan => JSON.stringify(plan.op.name));
  const inputMatch = inputs.length ? `matches!(verb, ${inputs.join(" | ")})` : "false";
  const methods = plans.filter(plan => plan.op.verb !== "post")
    .map(plan => `        ${JSON.stringify(plan.op.name)} => Method::${plan.op.verb.toUpperCase()},`).join("\n");
  const paths = plans.map(plan => `        ${JSON.stringify(plan.op.name)} => ${JSON.stringify(plan.op.path)},`).join("\n");
  return template("client_auto")
    .replaceAll("__BIN__", bin)
    .replaceAll("__SERVER_BIN__", `${bin}-server`)
    .replaceAll("__CLI_TYPE__", pascalCase(bin))
    .replace("        // __COMMAND_ARMS__", arms)
    .replace("        // __METHOD_ARMS__", methods)
    .replace("        // __PATH_ARMS__", paths)
    .replace("__INPUT_MATCH__", inputMatch);
}

function inputHandler(plan: OpPlan, bin: string): string {
  const response = plan.returnsStream ? "jsonl_response(out, diagnostics).await" : "raw_response(out, &diagnostics).await";
  const header = `x-${bin}-request`;
  return `async fn ${plan.fn}(headers: HeaderMap, body: Body) -> Response {
    let encoded = match headers.get(${JSON.stringify(header)}).and_then(|header| header.to_str().ok()) {
        Some(encoded) => encoded,
        None => return bad_request(${JSON.stringify(`missing ${header}`)}.into()),
    };
    let json = match base64::engine::general_purpose::STANDARD.decode(encoded) {
        Ok(json) => json,
        Err(error) => return bad_request(error.to_string()),
    };
    let request: Request = match serde_json::from_slice(&json) {
        Ok(request) => request,
        Err(error) => return bad_request(error.to_string()),
    };
    let root = request.request_root.clone();
    let args: ${plan.argsName} = match request.decode(${JSON.stringify(plan.op.name)}) { Ok(args) => args, Err(error) => return bad_request(error) };
    let input = jsonl_input(body);
    let diagnostics = Arc::new(Mutex::new(Vec::new()));
    let captured = diagnostics.clone();
    let out = tokio::task::spawn_blocking(move || crate::ops::with_request_context(root, Some(captured), || crate::ops::${plan.fn}(&args, input))).await;
    match out { Ok(out) => ${response}, Err(error) => error_response(OpError(error.to_string(), 1)) }
}`;
}

function serverFile(service: ServiceDef, plans: OpPlan[], bin: string): string {
  const handlers = plans.filter(plan => !plan.input).map(plan =>
    `${plan.returnsStream ? "stream_handler" : "raw_handler"}!(${plan.fn}, ${JSON.stringify(plan.op.name)}, ${plan.argsName}, ${plan.fn});`
  ).join("\n");
  const inputHandlers = plans.filter(plan => plan.input).map(plan => inputHandler(plan, bin)).join("\n\n");
  const routes = plans.map(plan => `        .route(${JSON.stringify(plan.op.path)}, ${plan.op.verb}(${plan.fn}))`).join("\n");
  return template("server_auto")
    .replace("__SERVICE__", service.name)
    .replaceAll("__BIN__", bin)
    .replaceAll("__REQUEST_HEADER__", `x-${bin}-request`)
    .replace("// __HANDLERS__", handlers)
    .replace("// __INPUT_HANDLERS__", inputHandlers)
    .replace("        // __ROUTES__", routes);
}

export function DaemonFiles(props: { service: ServiceDef; plans: OpPlan[]; types: TypeDef[]; bin: string }) {
  return <>
    <SourceFile path="daemon_auto.rs">{daemonFile(props.service, props.plans, props.types, props.bin)}</SourceFile>
    <SourceFile path="client_auto.rs">{clientFile(props.service, props.plans, props.bin)}</SourceFile>
    <SourceFile path="server_auto.rs">{serverFile(props.service, props.plans, props.bin)}</SourceFile>
  </>;
}
