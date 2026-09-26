import { readFileSync } from "node:fs";
import { SourceFile } from "../components/3_files/0_SourceFile.js";
import type { ModelDef, ModelProperty, ServiceDef, TypeDef } from "./00_types.js";
import type { OpPlan } from "./04_ops-plan.js";

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
    if (type.kind === "scalar" && (type.alias === "path" || type.name === "path" || property.cli?.positional && type.name === "string")) {
      names.add(property.name);
    }
  };
  op.op.params.forEach(visit);
  return [...names];
}

function daemonFile(service: ServiceDef, plans: OpPlan[], types: TypeDef[]): string {
  const paths = plans.map(plan => `        ${JSON.stringify(plan.op.name)} => &[${pathFields(plan, types).map(name => JSON.stringify(name)).join(", ")}],`).join("\n");
  return template("daemon_auto")
    .replace("__IDLE_SECS__", String(service.daemon?.idleSecs ?? 600))
    .replace("__HANDSHAKE__", String(service.daemon?.handshake ?? true))
    .replace("// __PATH_ARMS__", paths);
}

function clientFile(service: ServiceDef, plans: OpPlan[]): string {
  const defaultOp = plans.find(plan => plan.op.name === "extract") ?? plans[0];
  if (!defaultOp) throw new Error("daemon client needs an operation");
  const arms = [
    `None => (${JSON.stringify(defaultOp.op.name)}, serde_json::to_value(&cli.file)?),`,
    ...plans.map(plan => `Some(Cmd::${plan.variant}${plan.fields.length ? "(args)" : ""}) => (${JSON.stringify(plan.op.name)}, ${plan.fields.length ? "serde_json::to_value(args)?" : "serde_json::json!({})"}),`),
  ].map(line => `        ${line}`).join("\n");
  const input = plans.find(plan => plan.input)?.op.name ?? "";
  const methods = plans.filter(plan => plan.op.verb !== "post")
    .map(plan => `        ${JSON.stringify(plan.op.name)} => Method::${plan.op.verb.toUpperCase()},`).join("\n");
  return template("client_auto").replace("// __COMMAND_ARMS__", arms)
    .replace("// __METHOD_ARMS__", methods).replaceAll("__INPUT_VERB__", input);
}

function serverFile(plans: OpPlan[]): string {
  const input = plans.filter(plan => plan.input);
  if (input.length !== 1) throw new Error("daemon server expects one streamed request operation");
  const streamed = input[0]!;
  const handlers = plans.filter(plan => !plan.input).map(plan =>
    `${plan.returnsStream ? "stream_handler" : "raw_handler"}!(${plan.fn}, ${JSON.stringify(plan.op.name)}, ${plan.argsName}, ${plan.fn});`
  ).join("\n");
  const routes = plans.map(plan => `        .route(${JSON.stringify(plan.op.path)}, ${plan.op.verb}(${plan.fn}))`).join("\n");
  const oneshot = plans.map(plan => plan.input
    ? `        ${JSON.stringify(plan.op.name)} => {\n            let args: ${plan.argsName} = match request.decode(verb) { Ok(args) => args, Err(error) => return print_error(OpError(error, 2)) };\n            let input = std::io::stdin().lock().lines().map(|line| line.map_err(OpError::from).and_then(|line| serde_json::from_str(&line).map_err(OpError::from)));\n            write_one(crate::ops::${plan.fn}(&args, input))\n        },`
    : `        ${JSON.stringify(plan.op.name)} => ${plan.returnsStream ? "stream" : "raw"}!(${plan.argsName}, ${plan.fn}),`
  ).join("\n");
  return template("server_auto")
    .replace("// __HANDLERS__", handlers)
    .replace("// __ROUTES__", routes)
    .replace("// __ONESHOT_ARMS__", oneshot)
    .replaceAll("__INPUT_FN__", streamed.fn)
    .replaceAll("__INPUT_ARGS__", streamed.argsName)
    .replaceAll("__INPUT_VERB__", streamed.op.name);
}

export function DaemonFiles(props: { service: ServiceDef; plans: OpPlan[]; types: TypeDef[] }) {
  return <>
    <SourceFile path="daemon_auto.rs">{daemonFile(props.service, props.plans, props.types)}</SourceFile>
    <SourceFile path="client_auto.rs">{clientFile(props.service, props.plans)}</SourceFile>
    <SourceFile path="server_auto.rs">{serverFile(props.plans)}</SourceFile>
  </>;
}
