import { For, List, type Children, type Refkey, refkey } from "@alloy-js/core";
import { Attributes } from "../0_primitives/1_Attributes.js";
import { StructDeclaration, StructField, TupleStructDeclaration } from "../1_declarations/0_StructDeclaration.js";
import { EnumDeclaration } from "../1_declarations/1_EnumDeclaration.js";
import { TypeAlias } from "../1_declarations/3_TypeAlias.js";
import { FunctionDeclaration, type FunctionParam } from "../1_declarations/4_FunctionDeclaration.js";
import { SourceFile } from "../3_files/0_SourceFile.js";
import { CodegenPair, ImplCall } from "./1_CodegenPair.js";
import { axumRoutes, httpField, pascalCase, planCliTree, type CliNode, type OpPlan } from "../../emitter/04_ops-plan.js";
import type { RefkeyRegistry, RustType } from "../../emitter/01_type-map.js";
import type { ServiceDef } from "../../emitter/00_types.js";

export interface OpsKeys {
  opError: Refkey;
  opResult: Refkey;
  root: Refkey;
  cmd: Refkey;
}

function uses(types: (RustType | undefined)[], base: string[]): string[] {
  return [...new Set([...base, ...types.flatMap(t => t?.externalUses ?? [])])].sort();
}

function Items(props: { items: Children[] }) {
  return <For each={props.items} doubleHardline skipFalsy>{(item: Children) => item}</For>;
}

function itemResult(keys: OpsKeys, item: RustType | undefined): Children {
  return <>{keys.opResult}{"<"}{item?.code ?? "()"}{">"}</>;
}

function afterHelpExpr(value: string): string {
  const parts: string[] = [];
  let from = 0;
  for (const match of value.matchAll(/\$([A-Z][A-Z0-9_]*)/g)) {
    parts.push(JSON.stringify(value.slice(from, match.index)));
    parts.push(`env!(${JSON.stringify(match[1])})`);
    from = match.index! + match[0].length;
  }
  if (!parts.length) return JSON.stringify(value);
  parts.push(JSON.stringify(value.slice(from)));
  return `concat!(${parts.join(", ")})`;
}

function serdeDefaultName(plan: OpPlan, field: OpPlan["fields"][number]): string {
  return `__serde_default_${plan.fn}_${field.field}`;
}

// The stub's return: one value, or an Iterator of items ending at None (complete).
function stubReturns(keys: OpsKeys, p: OpPlan, daemon = false): Children {
  if (daemon) {
    if (!p.returnsStream) return <>OpResult{"<Vec<u8>>"}</>;
    return <>impl Iterator{"<"}Item = OpResult{"<Vec<u8>>"}{">"} + Send + 'static</>;
  }
  if (!p.returnsStream) return itemResult(keys, p.returns);
  return <>impl Iterator{"<"}Item = {itemResult(keys, p.returns)}{">"} + '_</>;
}

function opCallArgs(p: OpPlan, input: string): string[] {
  return p.input ? ["&args", input] : ["&args"];
}

// ops_auto.rs: the request shape per op, plus the error both transports share.
export function OpsAutoFile(props: { plans: OpPlan[]; keys: OpsKeys; daemon?: boolean }) {
  const fieldTypes = props.plans.flatMap(p => p.fields.map(f => f.cliType));
  return (
    <SourceFile path="ops_auto.rs" externalUses={uses(fieldTypes, [])}>
      <Items items={[
        <TupleStructDeclaration name="OpError" refkey={props.keys.opError} derive={["Debug"]} fields={props.daemon ? ["pub String", "pub i32"] : ["pub String"]} />,
        props.daemon ? "impl<E: std::error::Error> From<E> for OpError {\n    fn from(e: E) -> Self {\n        OpError(e.to_string(), 1)\n    }\n}" : "impl<E: std::error::Error> From<E> for OpError {\n    fn from(e: E) -> Self {\n        OpError(e.to_string())\n    }\n}",
        "impl std::fmt::Display for OpError {\n    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {\n        f.write_str(&self.0)\n    }\n}",
        <TypeAlias name="OpResult" refkey={props.keys.opResult} typeParams={[{ name: "T" }]}>
          Result{"<"}T, {props.keys.opError}{">"}
        </TypeAlias>,
        ...props.plans.map(p => (
          <StructDeclaration name={p.argsName} refkey={p.argsKey} derive={["clap::Args", "Debug", "Clone", "serde::Serialize", ...(props.daemon ? ["serde::Deserialize"] : []), ...(p.fields.length ? [] : ["Default"])]} attrs={p.op.requiredOneOf?.length ? [`command(group(clap::ArgGroup::new(${JSON.stringify(p.op.requiredOneOfName ?? "required_one_of")}).required(true).args([${p.op.requiredOneOf.map(n => JSON.stringify(n)).join(", ")}])))`] : undefined} braced>
            {p.fields.length > 0 ? (
              <List hardline>
                {p.fields.map(f => <StructField name={f.field} type={f.cliType.code} attrs={[...f.cliAttrs, ...(props.daemon && f.role === "flatten" ? ["serde(flatten)"] : []), ...(props.daemon && f.param.cli?.skip ? ["serde(skip)"] : []), ...(props.daemon && f.param.default !== undefined ? [`serde(default = ${JSON.stringify(serdeDefaultName(p, f))})`] : props.daemon && (f.param.type.kind === "array" || f.param.type.kind === "scalar" && f.param.type.name === "boolean") ? ["serde(default)"] : [])]} />)}
              </List>
            ) : undefined}
          </StructDeclaration>
        )),
        ...(props.daemon ? props.plans.flatMap(p => p.fields.filter(f => f.param.default !== undefined).map(f => `fn ${serdeDefaultName(p, f)}() -> ${f.cliType.code} { serde_json::from_value(serde_json::json!(${JSON.stringify(f.param.default)})).expect("TypeSpec default matches Rust field") }`)) : []),
      ]} />
    </SourceFile>
  );
}

// ops.rs: the one user-owned impl per op; both transports call it.
export function OpsStubFile(props: { plans: OpPlan[]; keys: OpsKeys; daemon?: boolean }) {
  return (
    <SourceFile path="ops.rs" externalUses={uses(props.plans.flatMap(p => [p.returns, p.input?.cliType]), [])}>
      <Items items={[
        ...(props.daemon ? [`thread_local! {
    static REQUEST_ROOT: std::cell::RefCell<Option<std::path::PathBuf>> = const { std::cell::RefCell::new(None) };
}

pub fn with_request_root<T>(root: std::path::PathBuf, run: impl FnOnce() -> T) -> T {
    REQUEST_ROOT.with(|slot| {
        let previous = slot.replace(Some(root));
        let result = run();
        slot.replace(previous);
        result
    })
}

pub fn request_root() -> std::path::PathBuf {
    REQUEST_ROOT.with(|slot| slot.borrow().clone()).unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from(".")))
}`] : []),
        ...props.plans.map(p => {
        const params: FunctionParam[] = [{ name: "args", type: <>&amp;{p.argsKey}</> }];
        if (p.input) params.push({ name: "input", type: <>impl Iterator{"<"}Item = {itemResult(props.keys, p.input.cliType)}{">"}</> });
        const unused = p.input ? "let _ = args;\nlet _ = input;\n" : "let _ = args;\n";
        return (
          <FunctionDeclaration name={p.fn} params={params} returns={stubReturns(props.keys, p, props.daemon)}>
            {unused + (p.returnsStream ? "std::iter::from_fn(|| todo!())" : "todo!()")}
          </FunctionDeclaration>
        );
      }),
      ]} />
    </SourceFile>
  );
}

function cliBody(p: OpPlan): Children {
  const call = <ImplCall fn={p.fn} args={opCallArgs(p, "read_jsonl(&mut *input)")} />;
  return p.returnsStream ? <>write_stream(out, {call})?;</> : p.returns ? <>write_json(out, &amp;{call}?)?;</> : <>{call}?;</>;
}

function cliArm(keys: OpsKeys, p: OpPlan, optional: boolean, pattern?: Children): Children {
  const body = cliBody(p);
  const empty = p.fields.length === 0;
  return <>        {pattern ?? <>{optional ? "Some(" : ""}{keys.cmd}::{p.variant}{empty ? "" : "(args)"}{optional ? ")" : ""}</>} =&gt; {"{"} {empty ? "let args = Default::default(); " : ""}{body} {"}"}</>;
}

function CliEnum(props: { node: CliNode; rootKey?: Refkey }) {
  return <EnumDeclaration name={props.node.enumName} refkey={props.rootKey ?? props.node.key} derive={["clap::Subcommand", "Debug"]}>
    <List hardline>{[...props.node.children.values()].map(node => <>
      {(node.plan?.op.doc !== undefined || node.plan?.op.afterHelp || node.plan?.op.hidden) ? <><Attributes attrs={[
        ...(node.plan?.op.hidden ? ["command(hide = true)"] : []),
        ...(node.plan?.op.doc !== undefined ? [`doc = ${JSON.stringify(node.plan.op.doc)}`] : []),
        ...(node.plan?.op.afterHelp ? [`command(after_help = ${afterHelpExpr(node.plan.op.afterHelp)})`] : []),
      ]} />{"\n"}</> : null}
      {node.variant}{node.children.size ? <>({node.commandKey})</> : node.plan!.fields.length ? <>({node.plan!.argsKey})</> : null},
    </>)}</List>
  </EnumDeclaration>;
}

function ownsArgs(node: CliNode): boolean {
  return !!node.plan?.fields.length;
}

function cliGroups(node: CliNode): Children[] {
  return [...node.children.values()].flatMap(child => child.children.size ? [
    <StructDeclaration name={child.commandName} refkey={child.commandKey} derive={["clap::Args", "Debug"]} attrs={ownsArgs(child) ? [`command(${child.plan?.op.subcommandRequired ? "subcommand_required = true" : "subcommand_negates_reqs = true"}${child.plan?.op.argsConflictsWithSubcommands ? ", args_conflicts_with_subcommands = true" : ""})`] : undefined}>
      {ownsArgs(child) && <StructField name="args" type={child.plan!.argsKey} attrs={["command(flatten)"]} />}
      <StructField name="cmd" type={ownsArgs(child) ? <>Option{"<"}{child.key}{">"}</> : child.key} attrs={["command(subcommand)"]} />
    </StructDeclaration>,
    <CliEnum node={child} />,
    ...cliGroups(child),
  ] : []);
}

function treeArms(keys: OpsKeys, node: CliNode, optional: boolean, root = false): Children[] {
  const enumKey = root ? keys.cmd : node.key;
  const arms = [...node.children.values()].map(child => {
    const pattern = <>{optional ? "Some(" : ""}{enumKey}::{child.variant}{child.children.size ? "(group)" : child.plan!.fields.length ? "(args)" : ""}{optional ? ")" : ""}</>;
    if (!child.children.size) return cliArm(keys, child.plan!, false, pattern);
    return <>        {pattern} =&gt; {"{"}{"\n"}
      match group.cmd {"{"}{"\n"}<List hardline>{treeArms(keys, child, ownsArgs(child))}</List>{"\n}"}
      {"\n}"}</>;
  });
  if (optional && node.plan) {
    const p = node.plan;
    arms.push(<>        None =&gt; {"{"} let args = {root ? "cli.file" : "group.args"}; {cliBody(p)} {"}"}</>);
  }
  return arms;
}

// cli_auto.rs: clap derive tree; run() writes JSON (JSONL for streams) and reads stdin JSONL.
export function CliAutoFile(props: { plans: OpPlan[]; keys: OpsKeys; bin: string; service: ServiceDef; registry: RefkeyRegistry; implPath: string }) {
  const rootPlan = props.service.daemon && props.service.rootArgs
    ? props.plans.find(plan => plan.fields.some(field => field.param.type.kind === "model" && field.param.type.name === props.service.rootArgs))
    : undefined;
  const commandPlans = props.plans.filter(plan => plan !== rootPlan);
  const tree = planCliTree(commandPlans, refkey);
  const root = props.service.rootArgs ? props.registry.get(props.service.rootArgs) : tree.plan?.argsKey;
  const command = [
    `name = ${JSON.stringify(props.bin)}`,
    "version",
    ...(props.service.doc !== undefined ? [`about = ${JSON.stringify(props.service.doc)}`] : []),
    ...(props.service.helpFooter !== undefined ? [`after_help = ${JSON.stringify(props.service.helpFooter)}`] : []),
    ...(props.service.afterHelp ? [`after_help = ${afterHelpExpr(props.service.afterHelp)}`] : []),
    ...(props.service.argsConflictsWithSubcommands ? ["args_conflicts_with_subcommands = true"] : []),
    ...(props.service.rootArgs ? ["subcommand_negates_reqs = true", "disable_help_subcommand = true"] : []),
  ];
  const readsInput = props.plans.some(p => p.input);
  return (
    <CodegenPair name="cli" implPath={props.implPath}>
      <SourceFile path="cli_auto.rs" externalUses={uses([], props.service.daemon ? [] : ["std::io::BufRead", "std::io::Write"])}>
        <Items items={[
          <StructDeclaration
            name={pascalCase(props.bin)}
            refkey={props.keys.root}
            derive={["clap::Parser", "Debug"]}
            attrs={[`command(${command.join(", ")})`]}
          >
            <StructField name="cmd" type={root ? <>Option{"<"}{props.keys.cmd}{">"}</> : props.keys.cmd} attrs={["command(subcommand)"]} />
            {root && <StructField name="file" type={root} attrs={["command(flatten)"]} />}
          </StructDeclaration>,
          <CliEnum node={tree} rootKey={props.keys.cmd} />,
          ...cliGroups(tree),
          !props.service.daemon && <FunctionDeclaration
            name="run"
            params={[
              { name: "cli", type: props.keys.root },
              { name: "input", type: "&mut dyn BufRead" },
              { name: "out", type: "&mut dyn Write" },
            ]}
            returns={itemResult(props.keys, undefined)}
          >
            {readsInput ? null : <>let _ = input;{"\n"}</>}
            match cli.cmd {"{"}{"\n"}
            <List hardline>{treeArms(props.keys, tree, !!root, true)}</List>
            {root && !tree.plan ? "\n        None => { let _ = cli.file; }" : ""}
            {"\n}\nOk(())"}
          </FunctionDeclaration>,
          !props.service.daemon && <FunctionDeclaration name="main" params={[{ name: "cli", type: props.keys.root }]} returns="std::process::ExitCode">
            {"let stdin = std::io::stdin();\nlet stdout = std::io::stdout();\nmatch run(cli, &mut stdin.lock(), &mut stdout.lock()) {\n    Ok(()) => std::process::ExitCode::SUCCESS,\n    Err(e) => {\n        eprintln!(\"error: {e}\");\n        std::process::ExitCode::FAILURE\n    }\n}"}
          </FunctionDeclaration>,
          !props.service.daemon && <>fn write_json{"<"}T: serde::Serialize{">"}(out: &amp;mut dyn Write, value: &amp;T) -&gt; {itemResult(props.keys, undefined)} {"{"}{"\n"}    serde_json::to_writer(&amp;mut *out, value)?;{"\n"}    out.write_all(b"\n")?;{"\n"}    Ok(()){"\n"}{"}"}</>,
          !props.service.daemon && props.plans.some(p => p.returnsStream) && `pub fn write_stream<T: serde::Serialize>(out: &mut dyn Write, items: impl Iterator<Item = OpResult<T>>) -> OpResult<()> {
    let mut rows = 0u64;
    for item in items {
        match item {
            Ok(value) => { write_json(out, &value)?; rows += 1; }
            Err(error) => {
                write_json(out, &serde_json::json!({"error": &error.0}))?;
                write_json(out, &serde_json::json!({"complete": false, "rows": rows}))?;
                return Err(error);
            }
        }
    }
    write_json(out, &serde_json::json!({"complete": true, "rows": rows}))?;
    Ok(())
}`,
          !props.service.daemon && readsInput && <>fn read_jsonl{"<'a, T: serde::de::DeserializeOwned>"}(input: &amp;'a mut dyn BufRead) -&gt; impl Iterator{"<"}Item = {props.keys.opResult}{"<T>> + 'a {"}{"\n"}    input.lines().map(|line| Ok(serde_json::from_str(&amp;line?)?)){"\n"}{"}"}</>,
        ]} />
      </SourceFile>
    </CodegenPair>
  );
}

const AXUM_VERB: Record<string, string> = { get: "get", post: "post", put: "put", patch: "patch", delete: "delete", head: "head" };

const JSONL_RESPONSE = `fn jsonl_response(produce: impl FnOnce(&mut dyn FnMut(OpResult<Vec<u8>>) -> bool) + Send + 'static) -> Response {
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Bytes, std::io::Error>>(64);
    tokio::task::spawn_blocking(move || {
        let mut rows = 0u64;
        let mut failed = false;
        let mut connected = true;
        produce(&mut |line| {
            let mut bytes = match line {
                Ok(bytes) => { rows += 1; bytes }
                Err(error) => {
                    failed = true;
                    serde_json::to_vec(&serde_json::json!({"error": error.0})).expect("error row serializes")
                }
            };
            bytes.push(b'\\n');
            connected = tx.blocking_send(Ok(Bytes::from(bytes))).is_ok();
            connected && !failed
        });
        if connected {
            let mut complete = serde_json::to_vec(&serde_json::json!({"complete": !failed, "rows": rows})).expect("completion row serializes");
            complete.push(b'\\n');
            let _ = tx.blocking_send(Ok(Bytes::from(complete)));
        }
    });
    let stream = futures_util::stream::unfold(rx, |mut rx| async move { rx.recv().await.map(|chunk| (chunk, rx)) });
    ([(CONTENT_TYPE, "application/x-ndjson")], Body::from_stream(stream)).into_response()
}`;

const JSONL_INPUT = `fn jsonl_input<T: DeserializeOwned + Send + 'static>(body: Body) -> impl Iterator<Item = OpResult<T>> + Send {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<OpResult<T>>(64);
    tokio::spawn(async move {
        let chunks = body.into_data_stream().map(|chunk| chunk.map_err(std::io::Error::other));
        let reader = tokio_util::io::StreamReader::new(chunks);
        let mut lines = tokio_util::codec::FramedRead::new(reader, tokio_util::codec::LinesCodec::new());
        while let Some(line) = lines.next().await {
            let value = line.map_err(OpError::from).and_then(|line| serde_json::from_str(&line).map_err(OpError::from));
            if tx.send(value).await.is_err() {
                return;
            }
        }
    });
    std::iter::from_fn(move || rx.blocking_recv())
}`;

// http_auto.rs: one axum handler per op (extractors -> <Op>Args -> crate::ops on the blocking pool) and the Router.
export function HttpAutoFile(props: { plans: OpPlan[]; keys: OpsKeys; registry: RefkeyRegistry; implPath: string }) {
  const handlers = props.plans.map(p => {
    const fields = p.fields.map(f => ({ plan: f, http: httpField(f, props.registry) }));
    const pathFields = fields.filter(f => f.plan.param.source === "path");
    const queryFields = fields.filter(f => f.plan.param.source === "query");
    const headerFields = fields.filter(f => f.plan.param.source === "header");
    const body = fields.find(f => f.plan.param.source === "body");
    const optionalPath = pathFields.some(f => f.plan.param.optional);
    return { p, fields, pathFields, queryFields, headerFields, body, optionalPath };
  });
  const streamsOut = props.plans.some(p => p.returnsStream);
  const streamsIn = props.plans.some(p => p.input);
  const structTypes = handlers.flatMap(h => h.fields.map(f => f.http.structType));
  const verbs = [...new Set(props.plans.map(p => `axum::routing::${AXUM_VERB[p.op.verb]}`))];
  return (
    <CodegenPair name="http" implPath={props.implPath}>
      <SourceFile
        path="http_auto.rs"
        externalUses={uses(structTypes.concat(props.plans.map(p => p.returns)), [
          "axum::Json",
          "axum::extract::Path",
          "axum::http::StatusCode",
          ...(handlers.some(h => h.headerFields.length) ? ["axum::http::HeaderMap"] : []),
          "axum::response::IntoResponse",
          "axum::response::Response",
          "axum_extra::extract::Query",
          "serde::Deserialize",
          ...verbs,
          ...(streamsOut || streamsIn ? ["axum::body::Body"] : []),
          ...(streamsOut ? ["axum::body::Bytes", "axum::http::header::CONTENT_TYPE"] : []),
          ...(streamsIn ? ["futures_util::StreamExt", "serde::de::DeserializeOwned"] : []),
        ])}
      >
        <Items items={[
          <>impl IntoResponse for {props.keys.opError} {"{"}{"\n"}    fn into_response(self) -&gt; Response {"{"}{"\n"}        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"{"}"error": self.0{"}"}))).into_response(){"\n"}    {"}"}{"\n"}{"}"}</>,
          streamsOut && JSONL_RESPONSE,
          streamsIn && JSONL_INPUT,
          ...handlers.flatMap(h => {
            const out: Children[] = [];
            if (h.pathFields.length > 0) {
              out.push(
                <StructDeclaration name={`${h.p.variant}Path`} derive={["Deserialize", "Default", "Debug"]} braced>
                  <List hardline>{h.pathFields.map(f => <StructField name={f.plan.field} type={f.http.structType!.code} />)}</List>
                </StructDeclaration>,
              );
            }
            if (h.queryFields.length > 0) {
              out.push(
                <StructDeclaration name={`${h.p.variant}Query`} derive={["Deserialize", "Debug"]} braced>
                  <List hardline>
                    {h.queryFields.map(f => (
                      <StructField
                        name={f.plan.field}
                        type={f.http.structType!.code}
                        attrs={f.plan.param.type.kind === "array" ? ["serde(default)"] : undefined}
                      />
                    ))}
                  </List>
                </StructDeclaration>,
              );
            }
            const params: FunctionParam[] = [
              ...(h.pathFields.length === 0
                ? []
                : h.optionalPath
                  ? [{ name: "path", type: <>Option{"<"}Path{"<"}{h.p.variant}Path{">>"}</> }]
                  : [{ name: "Path(path)", type: <>Path{"<"}{h.p.variant}Path{">"}</> }]),
              ...(h.queryFields.length === 0 ? [] : [{ name: "Query(query)", type: <>Query{"<"}{h.p.variant}Query{">"}</> }]),
              ...(h.headerFields.length === 0 ? [] : [{ name: "headers", type: "HeaderMap" }]),
              ...(h.body ? [{ name: "Json(body)", type: <>Json{"<"}{h.body.plan.cliType.code}{">"}</> }] : []),
              ...(h.p.input ? [{ name: "body", type: "Body" }] : []),
            ];
            const call = <ImplCall fn={h.p.fn} args={opCallArgs(h.p, "input")} />;
            const invoke = h.p.returnsStream ? (
              <>jsonl_response(move |emit| {"{"}{"\n"}    for item in {call} {"{"}{"\n"}        if !emit(item.and_then(|v| Ok(serde_json::to_vec(&amp;v)?))) {"{"}{"\n"}            break;{"\n"}        {"}"}{"\n"}    {"}"}{"\n"}{"}"})</>
            ) : (
              <>let out = tokio::task::spawn_blocking(move || {call}).await??;{"\n"}Ok(Json(out))</>
            );
            out.push(
              <FunctionDeclaration
                name={h.p.fn}
                async
                params={params}
                returns={h.p.returnsStream ? "Response" : <>{props.keys.opResult}{"<"}Json{"<"}{h.p.returns?.code ?? "()"}{">>"}</>}
              >
                {h.optionalPath ? <>let path = path.map(|Path(p)| p).unwrap_or_default();{"\n"}</> : null}
                let args = {h.p.argsKey} {"{"}{"\n"}
                <List hardline>{h.fields.map(f => <>    {f.plan.field}: {f.http.expr},</>)}</List>
                {"\n};\n"}
                {h.p.input ? <>let input = jsonl_input::{"<"}{h.p.input.cliType.code}{">"}(body);{"\n"}</> : null}
                {invoke}
              </FunctionDeclaration>,
            );
            return out;
          }),
          <FunctionDeclaration name="router" returns="axum::Router">
            axum::Router::new(){"\n"}
            <List hardline>
              {props.plans.flatMap(p =>
                axumRoutes(p.op).map(route => <>    .route({JSON.stringify(route)}, {AXUM_VERB[p.op.verb]}({p.fn}))</>),
              )}
            </List>
          </FunctionDeclaration>,
        ]} />
      </SourceFile>
    </CodegenPair>
  );
}
