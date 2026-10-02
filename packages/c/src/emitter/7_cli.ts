import { refkey } from "@alloy-js/core";
import { planCliTree, roleOf, type ModelProperty, type OperationDef, type OperationParam, type ProgramOps, type RouteNode } from "@hafley/emit-helper/http";
import { assertDistinctIdentifiers, cIdentifier } from "../c/0_name-policy.js";
import type { CFile } from "./2_emit.js";
import { cString, namespaceSymbol } from "./4_store.js";
import { cliRuntime } from "./6_cli_runtime.js";

type Field = ModelProperty & { positional?: boolean; stream?: boolean };
type Plan = { op: OperationDef; fields: Field[] };

function flatten(props: ModelProperty[], input: ProgramOps, stack: string[] = []): Field[] {
  return props.flatMap(p => {
    const ref = p.type;
    if (ref.kind !== "model") return [{ ...p }];
    if (stack.includes(ref.name)) throw new Error(`Recursive CLI flatten: ${ref.name}`);
    const model = input.types.find(t => t.kind === "model" && t.name === ref.name);
    if (!model || model.kind !== "model") throw new Error(`Missing CLI model: ${ref.name}`);
    return flatten(model.properties, input, [...stack, ref.name]);
  });
}
function opFields(op: OperationDef, input: ProgramOps): Field[] {
  return op.params.flatMap((p: OperationParam) => roleOf(p) === "flatten"
    ? flatten([p], input)
    : [{ ...p, positional: roleOf(p) === "positional", stream: p.stream }]);
}
function element(type: ModelProperty["type"]): string {
  if (type.kind === "enum") return "char *";
  if (type.kind !== "scalar") throw new Error(`Unsupported CLI element: ${type.kind}`);
  if (["string", "path", "url", "utcDateTime", "offsetDateTime", "plainDate", "plainTime", "duration"].includes(type.name)) return "char *";
  if (type.name === "boolean") return "bool";
  if (/^uint(8|16|32|64)$/.test(type.name)) return `uint${type.name.slice(4)}_t`;
  if (/^int(8|16|32|64)$/.test(type.name)) return `${type.name}_t`;
  if (type.name === "float32") return "float";
  if (["float64", "float", "numeric"].includes(type.name)) return "double";
  throw new Error(`Unsupported CLI scalar: ${type.name}`);
}
function repeated(field: Field): boolean { return field.type.kind === "array" || field.type.kind === "map"; }
function bool(field: Field): boolean { return field.type.kind === "scalar" && field.type.name === "boolean"; }
function fieldsHeader(fields: Field[]): string {
  assertDistinctIdentifiers(fields.flatMap(f => [f.name, `has_${f.name}`]), "CLI fields");
  return fields.map(f => {
    const name = cIdentifier(f.name);
    let type: string;
    if (f.stream) type = "FILE *";
    else if (f.type.kind === "array") type = `struct { size_t count; ${element(f.type.element)} *items; }`;
    else if (f.type.kind === "map") {
      if (f.type.key.name !== "string" || f.type.value.kind !== "scalar" || f.type.value.name !== "string") throw new Error("CLI maps require string keys and values");
      type = "struct { size_t count; struct { char *key; char *value; } *items; }";
    } else type = element(f.type);
    return `  bool has_${name};\n  ${type} ${name};\n`;
  }).join("") || "  unsigned char _empty;\n";
}
function longName(f: Field): string { return f.cli?.long ?? f.name.replaceAll("_", "-"); }
function descriptors(fields: Field[], offset = 0, globalOnly = false): string[] {
  const longs: string[] = [], shorts: string[] = [];
  const result = fields.flatMap((f, i) => {
    if (globalOnly && !f.cli?.global) return [];
    if (f.positional || f.cli?.positional || f.cli?.skip || f.stream) return [];
    const name = longName(f);
    if (!name || name.startsWith("-") || name.includes("=") || name === "help") throw new Error(`Reserved or invalid CLI option: ${name}`);
    longs.push(name);
    const short = f.cli?.short;
    if (short) {
      if (!/^[A-Za-z0-9]$/.test(short)) throw new Error(`Invalid CLI short option: ${short}`);
      shorts.push(short);
    }
    return [`  {${cString(name)}, ${short ? short.charCodeAt(0) : 0}, ${bool(f)}, ${repeated(f)}, ${offset + i}}`];
  });
  if (new Set(longs).size !== longs.length || new Set(shorts).size !== shorts.length) throw new Error("CLI option spelling collision");
  return result;
}
function convert(type: ModelProperty["type"], source: string, target: string, input: ProgramOps, error: string, cli?: ModelProperty["cli"]): string {
  if (type.kind === "enum") {
    const def = input.types.find(t => t.kind === "enum" && t.name === type.name);
    if (!def || def.kind !== "enum") throw new Error(`Missing CLI enum: ${type.name}`);
    return `if (${def.members.map(m => `strcmp(${source}, ${cString(String(m.value ?? m.name))}) != 0`).join(" && ") || "true"}) return cli_error(err, ${cString(error)});\n${target} = ${source};\n`;
  }
  const c = element(type);
  if (c === "char *") return `${target} = ${source};\n`;
  if (c === "bool") return `if (strcmp(${source}, "true") && strcmp(${source}, "false")) return cli_error(err, ${cString(error)});\n${target} = strcmp(${source}, "true") == 0;\n`;
  const unsigned = c.startsWith("uint"), real = c === "float" || c === "double";
  let condition = `!cli_${real ? "real" : unsigned ? "u64" : "i64"}(${source}, &number)`;
  const bits = c.match(/\d+/)?.[0];
  if (bits && Number(bits) < 64) condition += unsigned ? ` || number > UINT${bits}_MAX` : ` || number < INT${bits}_MIN || number > INT${bits}_MAX`;
  if (c === "float") condition += " || number < -FLT_MAX || number > FLT_MAX";
  if (cli?.minValue !== undefined && (!unsigned || cli.minValue > 0)) condition += ` || number < ${cli.minValue}`;
  if (cli?.maxValue !== undefined) condition += ` || number > ${cli.maxValue}`;
  return `{ ${real ? "double" : unsigned ? "uint64_t" : "int64_t"} number;\nif (${condition}) return cli_error(err, ${cString(error)});\n${target} = (${c})number;\n}\n`;
}
function fill(fields: Field[], target: string, input: ProgramOps, offset: number, roots: Field[] = []): string {
  let code = "";
  for (const [i, field] of fields.entries()) {
    const name = cIdentifier(field.name), value = `values[${offset + i}]`, destination = `${target}.${name}`;
    const positional = field.positional || field.cli?.positional;
    if (field.stream) { code += `${destination} = input; ${target}.has_${name} = input != NULL;\n`; continue; }
    if (positional && !field.cli?.skip) code += repeated(field)
      ? `while (position < positionals.count) { if (cli_push(arena, &${value}, positionals.items[position++], true)) return cli_error(err, "allocation failed"); }\n`
      : `if (position < positionals.count) { if (cli_push(arena, &${value}, positionals.items[position++], false)) return cli_error(err, "allocation failed"); }\n`;
    if (repeated(field) && field.cli?.valueDelimiter) {
      if (field.cli.valueDelimiter.length !== 1 || field.cli.valueDelimiter.charCodeAt(0) > 127) throw new Error("C CLI delimiters require one ASCII character");
      code += `if (${value}.present) {\ncli_value expanded = {0};\nfor (size_t i = 0; i < ${value}.count; ++i) {\nchar *part = ${value}.items[i];\nfor (;;) {\nchar *separator = strchr(part, ${field.cli.valueDelimiter.charCodeAt(0)});\nif (separator) *separator = 0;\nif (cli_push(arena, &expanded, part, true)) return cli_error(err, "allocation failed");\nif (!separator) break;\npart = separator + 1;\n}\n}\n${value} = expanded;\n}\n`;
    }
    if (field.default !== undefined) code += `if (!${value}.present) { if (cli_push(arena, &${value}, ${cString(String(field.default))}, false)) return cli_error(err, "allocation failed"); }\n`;
    if ((!field.optional && !bool(field) && !repeated(field) && !field.cli?.skip) || field.cli?.required) code += `if (!${value}.present) return cli_error(err, ${cString(`missing ${positional ? field.name : `--${longName(field)}`}`)});\n`;
    code += `${target}.has_${name} = ${value}.present;\nif (${value}.present) {\n`;
    if (field.type.kind === "array" || field.type.kind === "map") {
      code += `${destination}.count = ${value}.count;\n${destination}.items = mi_heap_zalloc(arena, ${value}.count * sizeof(*${destination}.items));\nif (!${destination}.items) return cli_error(err, "allocation failed");\nfor (size_t i = 0; i < ${value}.count; ++i) {\n`;
      if (field.type.kind === "array") code += convert(field.type.element, `${value}.items[i]`, `${destination}.items[i]`, input, `invalid ${field.name}`, field.cli);
      else code += `char *equal = strchr(${value}.items[i], '=');\nif (!equal || equal == ${value}.items[i]) return cli_error(err, "expected KEY=VALUE");\n*equal = '\0';\n${destination}.items[i].key = ${value}.items[i];\n${destination}.items[i].value = equal + 1;\n`;
      code += "}\n";
    } else code += convert(field.type, `${value}.items[0]`, destination, input, `invalid ${field.name}`, field.cli);
    code += "}\n";
  }
  const byName = new Map([...roots.map((f, i) => [f.name, i] as const), ...fields.map((f, i) => [f.name, offset + i] as const)]);
  for (const [i, field] of fields.entries()) {
    const requirements = [field.cli?.requires, ...(field.cli?.requiresAll ?? [])].filter((s): s is string => !!s);
    for (const other of requirements) {
      const j = byName.get(other);
      if (j === undefined) throw new Error(`Unknown CLI required field: ${other}`);
      code += `if (values[${offset + i}].present && !values[${j}].present) return cli_error(err, ${cString(`${field.name} requires ${other}`)});\n`;
    }
    for (const other of field.cli?.conflictsWith ?? []) {
      const j = byName.get(other);
      if (j === undefined) throw new Error(`Unknown CLI conflicting field: ${other}`);
      code += `if (values[${offset + i}].present && values[${j}].present) return cli_error(err, ${cString(`${field.name} conflicts with ${other}`)});\n`;
    }
  }
  return code;
}
function oneOf(names: string[] | undefined, fields: Field[], offset: number, label: string): string {
  if (!names?.length) return "";
  const terms = names.map(name => {
    const i = fields.findIndex(f => f.name === name);
    if (i < 0) throw new Error(`Unknown CLI group member: ${name}`);
    return `values[${offset + i}].present`;
  });
  return `if (!(${terms.join(" || ")})) return cli_error(err, ${cString(`one of ${label} is required`)});\n`;
}

export function emitCli(input: ProgramOps): CFile[] {
  const ns = cIdentifier(input.service.name), prefix = namespaceSymbol(ns);
  assertDistinctIdentifiers(input.service.operations.map(op => op.name), "CLI operations");
  const rootModel = input.types.find(t => t.kind === "model" && t.name === input.service.rootArgs);
  const roots = rootModel?.kind === "model" ? flatten(rootModel.properties, input) : [];
  if (roots.some(f => f.cli?.positional)) throw new Error("Root CLI positional arguments require an explicit operation");
  const plans: Plan[] = input.service.operations.map(op => ({ op, fields: opFields(op, input) }));
  for (const plan of plans) {
    const positional = plan.fields.filter(f => f.positional || f.cli?.positional);
    if (positional.slice(0, -1).some(repeated)) throw new Error(`CLI variadic must be last: ${plan.op.name}`);
  }
  const tree = planCliTree(plans, refkey);
  const nodes: RouteNode<Plan>[] = [];
  const parents: number[] = [];
  function visit(node: RouteNode<Plan>, parent: number): void {
    const id = nodes.length; nodes.push(node); parents.push(parent);
    for (const child of node.children.values()) visit(child, id);
  }
  visit(tree, -1);
  const help = (node: RouteNode<Plan>): string => {
    const command = [input.service.name, ...node.path].join(" ");
    const doc = node.plan?.op.doc ?? (node === tree ? input.service.doc : undefined);
    const fields = [...roots, ...(node.plan?.fields ?? [])];
    return `${doc ? `${doc}\n\n` : ""}Usage: ${command}${node.children.size ? " <COMMAND>" : ""}${fields.some(f => f.positional) ? " [ARGUMENTS]" : ""}\n` +
      (node.children.size ? `\nCommands:\n${[...node.children.values()].filter(n => !n.plan?.op.hidden).map(n => `  ${n.segment}${n.plan?.op.doc ? `  ${n.plan.op.doc}` : ""}\n`).join("")}` : "") +
      `\nOptions:\n${fields.filter(f => !f.positional && !f.cli?.skip && !f.cli?.hidden && !f.stream).map(f => `  ${f.cli?.short ? `-${f.cli.short}, ` : ""}--${longName(f)}${bool(f) ? "" : ` <${f.cli?.valueName ?? f.name}>`}${f.doc ? `  ${f.doc}` : ""}\n`).join("")}  --help  Print help\n${node.plan?.op.afterHelp ?? (node === tree ? input.service.afterHelp ?? input.service.helpFooter ?? "" : "")}`;
  };
  const header = `#pragma once\n#include <stdbool.h>\n#include <stddef.h>\n#include <stdint.h>\n#include <stdio.h>\n#include <mimalloc.h>\n\ntypedef struct ${prefix}_root_args {\n${fieldsHeader(roots)}} ${prefix}_root_args;\n\n` + plans.map(plan => {
    const name = `${prefix}_${cIdentifier(plan.op.name)}`;
    return `typedef struct ${name}_args {\n${fieldsHeader(plan.fields)}} ${name}_args;\n`;
  }).join("\n") + `\ntypedef enum ${prefix}_operation {\n${plans.map(p => `  ${prefix}_operation_${cIdentifier(p.op.name)}`).join(",\n")}\n} ${prefix}_operation;\ntypedef struct ${prefix}_request {\n  ${prefix}_operation operation;\n  ${prefix}_root_args root;\n  union {\n${plans.map(p => `    ${prefix}_${cIdentifier(p.op.name)}_args ${cIdentifier(p.op.name)};`).join("\n")}\n  } args;\n} ${prefix}_request;\n\ntypedef struct ${prefix}_ops {\n${plans.map(p => `  int (*${cIdentifier(p.op.name)})(void *self, mi_heap_t *arena, const ${prefix}_root_args *root, const ${prefix}_${cIdentifier(p.op.name)}_args *args, FILE *input);`).join("\n")}\n} ${prefix}_ops;\n#define ${prefix}_ops_init(${plans.map(p => cIdentifier(p.op.name)).join(", ")}) ((${prefix}_ops){ ${plans.map(p => cIdentifier(p.op.name)).join(", ")} })\nint ${prefix}_cli_parse(mi_heap_t *arena, int argc, char **argv, ${prefix}_request *request, FILE *input, FILE *err);\nint ${prefix}_cli_dispatch(const ${prefix}_ops *ops, void *self, mi_heap_t *arena, const ${prefix}_request *request, FILE *input);\n`;
  const rootFlags = descriptors(roots);
  if (!plans.length) throw new Error("CLI service has no operations");
  const maxFields = Math.max(1, ...plans.map(p => roots.length + p.fields.length));
  let source = `#include "cli_auto.h"\n#include <getopt.h>\n#include <errno.h>\n#include <float.h>\n#include <limits.h>\n#include <math.h>\n#include <stdlib.h>\n#include <string.h>\n\n${cliRuntime.replaceAll("static bool cli_", "static inline bool cli_")}\n`;
  source += `static const struct { int parent; const char *segment; int operation; const char *help; } commands[] = {\n${nodes.map((node, i) => `  {${parents[i]}, ${cString(node.segment)}, ${node.plan ? plans.indexOf(node.plan) : -1}, ${cString(help(node))}}`).join(",\n")}\n};\n\n`;
  source += `int ${prefix}_cli_parse(mi_heap_t *arena, int argc, char **argv, ${prefix}_request *request, FILE *input, FILE *err) {\n  if (!arena || argc < 1 || !argv || !request) return 2;\n  (void)input;\n  memset(request, 0, sizeof(*request));\n  cli_value values[${maxFields}] = {0}, positionals = {0};\n  size_t position = 0;\n  (void)position;\n  int cursor = 1, command = 0, rc;\n  const cli_flag root_flags[] = {\n${rootFlags.length ? rootFlags.join(",\n") + ",\n" : ""}    {NULL, 0, false, false, 0}\n  };\n  rc = cli_scan(arena, argc, argv, &cursor, root_flags, ${rootFlags.length}, values, &positionals, true, err);\n  if (rc) { if (rc == -1 && err) fputs(commands[0].help, err); return rc; }\n  while (cursor < argc) {\n    int next = -1;\n    for (size_t i = 1; i < sizeof(commands) / sizeof(commands[0]); ++i)\n      if (commands[i].parent == command && strcmp(commands[i].segment, argv[cursor]) == 0) { next = (int)i; break; }\n    if (next < 0) break;\n    command = next; ++cursor;\n  }\n  if (commands[command].operation < 0) {\n    if (err) fputs(commands[command].help, err);\n    return cursor < argc && strcmp(argv[cursor], "--help") == 0 && cursor + 1 == argc ? -1 : 2;\n  }\n  switch (commands[command].operation) {\n`;
  for (const [index, plan] of plans.entries()) {
    const op = cIdentifier(plan.op.name), flags = [...descriptors(roots, 0, true), ...descriptors(plan.fields, roots.length)];
    const names = [...roots, ...plan.fields].filter(f => !f.positional && !f.cli?.positional && !f.cli?.skip && !f.stream).map(longName);
    const shorts = [...roots, ...plan.fields].flatMap(f => f.cli?.short ? [f.cli.short] : []);
    if (new Set(shorts).size !== shorts.length) throw new Error(`Root/operation short option collision: ${plan.op.name}`);
    if (new Set(names).size !== names.length) throw new Error(`Root/operation option collision: ${plan.op.name}`);
    source += `  case ${index}: {\n    const cli_flag flags[] = {\n${flags.length ? flags.join(",\n") + ",\n" : ""}      {NULL, 0, false, false, 0}\n    };\n    rc = cli_scan(arena, argc, argv, &cursor, flags, ${flags.length}, values, &positionals, false, err);\n    if (rc) { if (rc == -1 && err) fputs(commands[command].help, err); return rc; }\n${plan.op.subcommandRequired ? '    if (err) fputs(commands[command].help, err);\n    return 2;\n' : `${fill(roots, "request->root", input, 0)}${fill(plan.fields, `request->args.${op}`, input, roots.length, roots)}${oneOf(plan.op.requiredOneOf, plan.fields, roots.length, plan.op.requiredOneOfName ?? "arguments")}${rootModel?.kind === "model" ? oneOf(rootModel.requiredOneOf, roots, 0, rootModel.requiredOneOfName ?? "arguments") : ""}    if (position != positionals.count) return cli_error(err, "unexpected positional argument");\n    request->operation = ${prefix}_operation_${op};\n    return 0;\n`}  }\n`;
  }
  source += `  }\n  return 2;\n}\n\nint ${prefix}_cli_dispatch(const ${prefix}_ops *ops, void *self, mi_heap_t *arena, const ${prefix}_request *request, FILE *input) {\n  if (!ops || !arena || !request) return 2;\n  switch (request->operation) {\n${plans.map(p => { const op = cIdentifier(p.op.name); return `  case ${prefix}_operation_${op}:\n    return ops->${op} ? ops->${op}(self, arena, &request->root, &request->args.${op}, ${p.fields.some(f => f.stream) ? "input" : "NULL"}) : 2;\n`; }).join("")}  }\n  (void)input;\n  return 2;\n}\n`;
  return [{ path: `${ns}/cli_auto.h`, contents: header }, { path: `${ns}/cli_auto.c`, contents: source }];
}
