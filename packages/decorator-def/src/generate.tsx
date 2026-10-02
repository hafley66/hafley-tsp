/**
 * Alloy components that render .tsp declarations and .ts factory implementations
 * from a LibrarySpec.
 */

import { For, Output, render, SourceDirectory, SourceFile } from "@alloy-js/core";
import type { LibrarySpec, DecoratorSpec, ParamSpec } from "./reader.js";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function pascalCase(s: string): string {
  return s.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

function tsType(type: string): string {
  switch (type) {
    case "int32": case "int64": case "float64": return "number";
    default: return type;
  }
}

// --------------------------------------------------------------------------
// .tsp components
// --------------------------------------------------------------------------

function TspDoc(props: { doc?: string; params?: ParamSpec[]; }) {
  if (!props.doc) return null;
  // Arrays instead of fragments: tsc's react-jsx output imports Fragment,
  // which @alloy-js/core/jsx-runtime does not export.
  return [
    "/**", "\n",
    " * ", props.doc, "\n",
    props.params?.filter(p => p.doc).map(p => [" * @param ", p.name, " ", p.doc, "\n"]),
    " */",
  ];
}

function TspParam(props: { param: ParamSpec }) {
  const p = props.param;
  const opt = p.optional ? "?" : "";
  return [p.name, opt, ": valueof ", p.type];
}

function TspDeclarator(props: { dec: DecoratorSpec }) {
  const dec = props.dec;
  const params = [
    `target: ${dec.targets}`,
    ...(dec.params ?? []).map(p => {
      const opt = p.optional ? "?" : "";
      return `${p.name}${opt}: valueof ${p.type}`;
    }),
  ];

  const doc = dec.doc
    ? `/**\n * ${dec.doc}\n */\n`
    : "";

  return [doc, "extern dec ", dec.name, "(", params.join(", "), ");"];
}

function TspFile(props: { spec: LibrarySpec }) {
  const lines = [
    "using TypeSpec.Reflection;",
    "",
    `namespace ${props.spec.namespace};`,
  ];

  return (
    <SourceFile path="decorators.tsp" filetype="tsp">
      {lines.join("\n")}
      <For each={props.spec.decorators} joiner={"\n"}>
        {(dec: DecoratorSpec) => ["\n", <TspDeclarator dec={dec} />]}
      </For>
      {"\n"}
    </SourceFile>
  );
}

// --------------------------------------------------------------------------
// .ts components
// --------------------------------------------------------------------------

function factoryCall(dec: DecoratorSpec, sk: string): string {
  const key = dec.exclusiveKey ? `${sk}.${dec.exclusiveKey}` : `${sk}.${dec.name}`;

  switch (dec.shape) {
    case "flag":
      return `const _${dec.name} = flagDec(${key});`;
    case "value": {
      const t = dec.params.length === 1 ? tsType(dec.params[0].type) : "string";
      return `const _${dec.name} = valueDec<${t}>(${key});`;
    }
    case "exclusive":
      return `const _${dec.name} = exclusiveDec<string>(${key}, "${dec.exclusiveValue ?? dec.name}", onDuplicate${pascalCase(dec.exclusiveKey ?? dec.name)});`;
    case "object": {
      const n = pascalCase(dec.name) + "Def";
      const args = dec.params.map(p => p.name).join(", ");
      return `const _${dec.name} = objectDec<${n}>(${sk}.${dec.name},\n  (_target, ${args}) => ({ ${args} }),\n);`;
    }
    case "list": {
      const n = pascalCase(dec.name) + "Def";
      const args = dec.params.map(p => p.name).join(", ");
      return `const _${dec.name} = listDec<${n}>(${sk}.${dec.name},\n  (_target, ${args}) => ({ ${args} }),\n);`;
    }
  }
}

function TsStateInterfaces(props: { decorators: DecoratorSpec[] }) {
  const structured = props.decorators.filter(d => d.shape === "object" || d.shape === "list");
  if (structured.length === 0) return null;

  const blocks = structured.map(dec => {
    const name = pascalCase(dec.name) + "Def";
    const fields = dec.params.map(p => {
      const opt = p.optional ? "?" : "";
      return `  ${p.name}${opt}: ${tsType(p.type)};`;
    }).join("\n");
    return `export interface ${name} {\n${fields}\n}`;
  });

  return [blocks.join("\n"), "\n"];
}

function TsConflictHandlers(props: { decorators: DecoratorSpec[] }) {
  const keys = new Set<string>();
  for (const d of props.decorators) {
    if (d.shape === "exclusive" && d.exclusiveKey) keys.add(d.exclusiveKey);
  }
  if (keys.size === 0) return null;

  const handlers = [...keys].map(k =>
    `function onDuplicate${pascalCase(k)}(program: any, target: any, name: string) {\n` +
    `  reportDiagnostic(program, { code: "duplicate-${k}", format: { name }, target });\n}`
  );

  return ["\n", handlers.join("\n"), "\n"];
}

function TsExclusiveGetters(props: { decorators: DecoratorSpec[] }) {
  const groups = new Map<string, DecoratorSpec[]>();
  for (const d of props.decorators) {
    if (d.shape === "exclusive" && d.exclusiveKey) {
      if (!groups.has(d.exclusiveKey)) groups.set(d.exclusiveKey, []);
      groups.get(d.exclusiveKey)!.push(d);
    }
  }
  if (groups.size === 0) return null;

  const lines: string[] = [];
  for (const [key, decs] of groups) {
    const union = decs.map(d => `"${d.exclusiveValue ?? d.name}"`).join(" | ");
    const name = pascalCase(key);
    lines.push(`export type ${name} = ${union};`);
    lines.push(`export const get${name} = _${decs[0].name}.get as (program: Program, target: Type) => ${name} | undefined;`);
  }

  return ["\n", lines.join("\n"), "\n"];
}

function TsFile(props: { spec: LibrarySpec; stateKeys: string }) {
  const { spec, stateKeys: sk } = props;
  const decs = spec.decorators;

  const imports = [
    `import type { Program, Type } from "@typespec/compiler";`,
    `import { ${sk}, reportDiagnostic } from "./lib.js";`,
    `import { flagDec, valueDec, objectDec, listDec, exclusiveDec } from "./decorator-factory.js";`,
  ].join("\n");

  const instances = decs.map(d => factoryCall(d, sk)).join("\n");

  const dollarExports = decs.map(d =>
    `export const $${d.name} = _${d.name}.$decorator;`
  ).join("\n");

  const accessors = decs
    .filter(d => d.shape !== "exclusive")
    .map(d => {
      if (d.shape === "flag") return `export const is${pascalCase(d.name)} = _${d.name}.has;`;
      return `export const get${pascalCase(d.name)} = _${d.name}.get;\nexport const has${pascalCase(d.name)} = _${d.name}.has;`;
    }).join("\n");

  const decoMap = decs.map(d => `    ${d.name}: $${d.name},`).join("\n");

  return (
    <SourceFile path="decorators.ts" filetype="ts">
      {imports}{"\n\n"}
      export const namespace = "{spec.namespace}";{"\n"}
      <TsStateInterfaces decorators={decs} />
      <TsConflictHandlers decorators={decs} />
      {"\n"}{instances}{"\n\n"}
      {dollarExports}{"\n\n"}
      {accessors}
      <TsExclusiveGetters decorators={decs} />
      {"\n"}export const $decorators = {"{"}{"\n"}
      {"  "}"{ spec.namespace}": {"{"}{"\n"}
      {decoMap}{"\n"}
      {"  }"},
      {"\n"}{"}"};{"\n"}
    </SourceFile>
  );
}

// --------------------------------------------------------------------------
// Root component + render entry
// --------------------------------------------------------------------------

function DecoratorLibrary(props: { spec: LibrarySpec; stateKeys: string }) {
  return (
    <Output>
      <SourceDirectory path=".">
        <TspFile spec={props.spec} />
        <TsFile spec={props.spec} stateKeys={props.stateKeys} />
      </SourceDirectory>
    </Output>
  );
}

export function generateDecoratorLibrary(spec: LibrarySpec, stateKeys: string) {
  return render(<DecoratorLibrary spec={spec} stateKeys={stateKeys} />);
}

// Convenience: extract specific files from the render output
function findFile(node: any, path: string): string | null {
  if (node.kind === "file" && node.path === path) return node.contents;
  if (node.contents && Array.isArray(node.contents)) {
    for (const child of node.contents) {
      const found = findFile(child, path);
      if (found !== null) return found;
    }
  }
  return null;
}

export function generateTsp(spec: LibrarySpec): string {
  const result = generateDecoratorLibrary(spec, "StateKeys");
  return findFile(result, "decorators.tsp") ?? "";
}

export function generateTs(spec: LibrarySpec, stateKeys: string): string {
  const result = generateDecoratorLibrary(spec, stateKeys);
  return findFile(result, "decorators.ts") ?? "";
}

export function generateStateConfig(spec: LibrarySpec): Record<string, { description: string }> {
  const keys: Record<string, { description: string }> = {};
  for (const dec of spec.decorators) {
    const name = dec.exclusiveKey ?? dec.name;
    keys[name] = { description: `State for @${dec.name} decorator` };
  }
  return keys;
}
