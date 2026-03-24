/**
 * Generates .tsp decorator declarations and factory-backed .ts implementations
 * from a single decorator spec definition.
 *
 * Define once, get:
 *   - decorators.tsp (extern dec + options models)
 *   - decorators.ts  (factory calls + typed accessors)
 */

// --------------------------------------------------------------------------
// Decorator spec types
// --------------------------------------------------------------------------

export type TargetType =
  | "Namespace"
  | "Interface"
  | "Operation"
  | "Model"
  | "ModelProperty"
  | "Enum"
  | "EnumMember"
  | "Scalar"
  | "Union";

export type ParamType = "string" | "boolean" | "int32" | "int64" | "float64";

export interface DecoratorParam {
  name: string;
  type: ParamType | string;  // string for custom model refs
  optional?: boolean;
  doc?: string;
}

export interface OptionsField {
  name: string;
  type: ParamType | string;
  optional?: boolean;
  doc?: string;
}

export type DecoratorShape = "flag" | "value" | "object" | "list" | "exclusive";

export interface DecoratorSpec {
  name: string;
  targets: TargetType | TargetType[];
  shape: DecoratorShape;
  doc?: string;
  params?: DecoratorParam[];
  options?: OptionsField[];  // generates a FooOptions model + valueof param
  exclusiveKey?: string;     // for "exclusive" shape: name of the shared state key
  exclusiveValue?: string;   // for "exclusive" shape: the value this decorator stores
  example?: string;
}

export interface LibrarySpec {
  namespace: string;
  decorators: DecoratorSpec[];
}

// --------------------------------------------------------------------------
// .tsp generation
// --------------------------------------------------------------------------

function tspTargetType(targets: TargetType | TargetType[]): string {
  if (Array.isArray(targets)) return targets.join(" | ");
  return targets;
}

function tspParamType(type: ParamType | string, valueof = true): string {
  const base = type;
  return valueof ? `valueof ${base}` : base;
}

function generateOptionsModel(dec: DecoratorSpec): string {
  if (!dec.options || dec.options.length === 0) return "";

  const modelName = pascalCase(dec.name) + "Options";
  const fields = dec.options.map(f => {
    const doc = f.doc ? `  /** ${f.doc} */\n` : "";
    const opt = f.optional !== false ? "?" : "";
    return `${doc}  ${f.name}${opt}: ${f.type};`;
  });

  return `model ${modelName} {\n${fields.join("\n\n")}\n}\n`;
}

function generateDecoratorTsp(dec: DecoratorSpec): string {
  const lines: string[] = [];

  // Doc comment
  if (dec.doc) {
    lines.push("/**");
    lines.push(` * ${dec.doc}`);
    if (dec.params) {
      lines.push(" *");
      for (const p of dec.params) {
        if (p.doc) lines.push(` * @param ${p.name} ${p.doc}`);
      }
    }
    if (dec.example) {
      lines.push(" *");
      lines.push(" * @example");
      lines.push(" * ```typespec");
      for (const line of dec.example.split("\n")) {
        lines.push(` * ${line}`);
      }
      lines.push(" * ```");
    }
    lines.push(" */");
  }

  // Build params
  const params: string[] = [`target: ${tspTargetType(dec.targets)}`];

  if (dec.params) {
    for (const p of dec.params) {
      const opt = p.optional ? "?" : "";
      params.push(`${p.name}${opt}: ${tspParamType(p.type)}`);
    }
  }

  if (dec.options && dec.options.length > 0) {
    const modelName = pascalCase(dec.name) + "Options";
    params.push(`options?: valueof ${modelName}`);
  }

  lines.push(`extern dec ${dec.name}(${params.join(", ")});`);

  return lines.join("\n");
}

export function generateTsp(spec: LibrarySpec): string {
  const sections: string[] = [];

  sections.push("using TypeSpec.Reflection;");
  sections.push("");
  sections.push(`namespace ${spec.namespace};`);

  for (const dec of spec.decorators) {
    sections.push("");

    const optionsModel = generateOptionsModel(dec);
    if (optionsModel) {
      sections.push(optionsModel);
    }

    sections.push(generateDecoratorTsp(dec));
  }

  return sections.join("\n") + "\n";
}

// --------------------------------------------------------------------------
// .ts generation (factory-backed decorators)
// --------------------------------------------------------------------------

function tsStateType(dec: DecoratorSpec): string {
  switch (dec.shape) {
    case "flag": return "boolean";
    case "value": {
      if (dec.params && dec.params.length === 1) return tsType(dec.params[0].type);
      return "string";
    }
    case "object":
    case "list": {
      return pascalCase(dec.name) + "Def";
    }
    case "exclusive": return "string";
  }
}

function tsType(type: ParamType | string): string {
  switch (type) {
    case "int32":
    case "int64":
    case "float64": return "number";
    default: return type;
  }
}

function generateDefInterface(dec: DecoratorSpec): string | null {
  if (dec.shape !== "object" && dec.shape !== "list") return null;

  const fields: string[] = [];
  for (const p of dec.params ?? []) {
    const opt = p.optional ? "?" : "";
    fields.push(`  ${p.name}${opt}: ${tsType(p.type)};`);
  }
  for (const f of dec.options ?? []) {
    fields.push(`  ${f.name}?: ${tsType(f.type)};`);
  }

  const name = pascalCase(dec.name) + "Def";
  return `export interface ${name} {\n${fields.join("\n")}\n}`;
}

function generateFactoryCall(dec: DecoratorSpec, stateKeysName: string): string {
  const stateKey = dec.exclusiveKey
    ? `${stateKeysName}.${dec.exclusiveKey}`
    : `${stateKeysName}.${dec.name}`;

  switch (dec.shape) {
    case "flag":
      return `const _${dec.name} = flagDec(${stateKey});`;

    case "value":
      return `const _${dec.name} = valueDec<${tsStateType(dec)}>(${stateKey});`;

    case "exclusive":
      return `const _${dec.name} = exclusiveDec<string>(${stateKey}, "${dec.exclusiveValue ?? dec.name}", onDuplicate${pascalCase(dec.exclusiveKey ?? dec.name)});`;

    case "object": {
      const allParams = [...(dec.params ?? []), ...(dec.options ?? []).map(f => ({ ...f, optional: true }))];
      const buildParams = allParams.map(p => p.name).join(", ");
      const buildBody = allParams.map(p => {
        if (p.optional) return `${p.name}: ${p.name}`;
        return `${p.name}`;
      }).join(", ");
      return `const _${dec.name} = objectDec<${tsStateType(dec)}>(${stateKey},\n  (_target, ${buildParams}) => ({ ${buildBody} }),\n);`;
    }

    case "list": {
      const allParams = [...(dec.params ?? []), ...(dec.options ?? []).map(f => ({ ...f, optional: true }))];
      const buildParams = allParams.map(p => p.name).join(", ");
      const buildBody = allParams.map(p => `${p.name}`).join(", ");
      return `const _${dec.name} = listDec<${tsStateType(dec)}>(${stateKey},\n  (_target, ${buildParams}) => ({ ${buildBody} }),\n);`;
    }
  }
}

function generateExports(dec: DecoratorSpec): string {
  const lines: string[] = [];
  lines.push(`export const $${dec.name} = _${dec.name}.$decorator;`);

  switch (dec.shape) {
    case "flag":
      lines.push(`export const is${pascalCase(dec.name)} = _${dec.name}.has;`);
      break;
    case "value":
    case "object":
    case "list":
      lines.push(`export const get${pascalCase(dec.name)} = _${dec.name}.get;`);
      lines.push(`export const has${pascalCase(dec.name)} = _${dec.name}.has;`);
      break;
    case "exclusive":
      // shared getter lives on the key name, not the decorator name
      break;
  }

  return lines.join("\n");
}

function generateExclusiveGetters(spec: LibrarySpec, stateKeysName: string): string[] {
  const exclusiveGroups = new Map<string, DecoratorSpec[]>();
  for (const dec of spec.decorators) {
    if (dec.shape === "exclusive" && dec.exclusiveKey) {
      if (!exclusiveGroups.has(dec.exclusiveKey)) exclusiveGroups.set(dec.exclusiveKey, []);
      exclusiveGroups.get(dec.exclusiveKey)!.push(dec);
    }
  }

  const lines: string[] = [];
  for (const [key, decs] of exclusiveGroups) {
    const unionType = decs.map(d => `"${d.exclusiveValue ?? d.name}"`).join(" | ");
    lines.push(`export type ${pascalCase(key)} = ${unionType};`);
    lines.push(`export const get${pascalCase(key)} = _${decs[0].name}.get as (program: Program, target: Type) => ${pascalCase(key)} | undefined;`);
  }
  return lines;
}

export function generateTs(spec: LibrarySpec, stateKeysName: string): string {
  const sections: string[] = [];

  sections.push(`import type { Program, Type } from "@typespec/compiler";`);
  sections.push(`import { ${stateKeysName}, reportDiagnostic } from "./lib.js";`);
  sections.push(`import { flagDec, valueDec, objectDec, listDec, exclusiveDec } from "./decorator-factory.js";`);
  sections.push("");
  sections.push(`export const namespace = "${spec.namespace}";`);

  // Interfaces
  const interfaces = spec.decorators.map(d => generateDefInterface(d)).filter(Boolean);
  if (interfaces.length > 0) {
    sections.push("");
    sections.push("// ---- State types ----");
    sections.push(interfaces.join("\n\n"));
  }

  // Exclusive conflict handlers
  const exclusiveKeys = new Set<string>();
  for (const dec of spec.decorators) {
    if (dec.shape === "exclusive" && dec.exclusiveKey) {
      exclusiveKeys.add(dec.exclusiveKey);
    }
  }
  if (exclusiveKeys.size > 0) {
    sections.push("");
    sections.push("// ---- Conflict handlers ----");
    for (const key of exclusiveKeys) {
      sections.push(`function onDuplicate${pascalCase(key)}(program: any, target: any, name: string) {`);
      sections.push(`  reportDiagnostic(program, { code: "duplicate-${key}", format: { name }, target });`);
      sections.push(`}`);
    }
  }

  // Factory calls
  sections.push("");
  sections.push("// ---- Decorator instances ----");
  for (const dec of spec.decorators) {
    sections.push(generateFactoryCall(dec, stateKeysName));
  }

  // $ exports
  sections.push("");
  sections.push("// ---- $decorator exports ----");
  for (const dec of spec.decorators) {
    sections.push(`export const $${dec.name} = _${dec.name}.$decorator;`);
  }

  // Accessor exports
  sections.push("");
  sections.push("// ---- Accessor exports ----");
  for (const dec of spec.decorators) {
    if (dec.shape === "exclusive") continue;
    switch (dec.shape) {
      case "flag":
        sections.push(`export const is${pascalCase(dec.name)} = _${dec.name}.has;`);
        break;
      default:
        sections.push(`export const get${pascalCase(dec.name)} = _${dec.name}.get;`);
        sections.push(`export const has${pascalCase(dec.name)} = _${dec.name}.has;`);
        break;
    }
  }

  // Exclusive group getters
  const exclusiveGetters = generateExclusiveGetters(spec, stateKeysName);
  if (exclusiveGetters.length > 0) {
    sections.push("");
    sections.push("// ---- Exclusive group types + getters ----");
    sections.push(...exclusiveGetters);
  }

  // tsp-index $decorators map
  sections.push("");
  sections.push("// ---- $decorators map (for tsp-index.ts) ----");
  sections.push(`export const $decorators = {`);
  sections.push(`  "${spec.namespace}": {`);
  for (const dec of spec.decorators) {
    sections.push(`    ${dec.name}: $${dec.name},`);
  }
  sections.push(`  },`);
  sections.push(`};`);

  return sections.join("\n") + "\n";
}

// State keys for lib.ts
export function generateStateKeys(spec: LibrarySpec): Record<string, { description: string }> {
  const keys: Record<string, { description: string }> = {};
  for (const dec of spec.decorators) {
    const keyName = dec.exclusiveKey ?? dec.name;
    keys[keyName] = { description: `State for @${dec.name} decorator` };
  }
  return keys;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function pascalCase(s: string): string {
  return s
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
