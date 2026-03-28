#!/usr/bin/env npx tsx
/**
 * Walks all TypeSpec types in the monorepo and emits a Graphviz .dot graph.
 *
 * Usage:
 *   npx tsx tools/tsp-dot.ts                    # prints dot to stdout
 *   npx tsx tools/tsp-dot.ts | dot -Tsvg -o graph.svg
 *   npx tsx tools/tsp-dot.ts | dot -Tpng -o graph.png
 */

import { compile } from "@typespec/compiler";
import type {
  Model,
  Enum,
  Union,
  Namespace,
  Type,
  Program,
  Scalar,
} from "@typespec/compiler";
import { resolve } from "node:path";

// ── Collect types ──────────────────────────────────────────────

interface NodeInfo {
  id: string;
  label: string;
  kind: "model" | "enum" | "union" | "scalar";
  namespace: string;
  fields: string[];
}

interface Edge {
  from: string;
  to: string;
  label?: string;
}

const nodes = new Map<string, NodeInfo>();
const edges: Edge[] = [];

const SKIP_NS = new Set(["TypeSpec", "TypeSpec.Reflection", "DecoratorDef"]);

function nsName(type: Type & { namespace?: Namespace }): string {
  if (!type.namespace) return "";
  return type.namespace.name;
}

function typeId(type: Type): string | null {
  if (type.kind === "Model" && type.name) return `${nsName(type)}.${type.name}`;
  if (type.kind === "Enum" && type.name) return `${nsName(type)}.${type.name}`;
  if (type.kind === "Union" && type.name) return `${nsName(type)}.${type.name}`;
  if (type.kind === "Scalar" && type.name) return `${nsName(type)}.${type.name}`;
  return null;
}

function dotSafe(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, "_");
}

function shortType(type: Type): string {
  if (type.kind === "Scalar") return type.name;
  if (type.kind === "Model" && type.name) return type.name;
  if (type.kind === "Enum" && type.name) return type.name;
  if (type.kind === "Union" && type.name) return type.name;
  if (type.kind === "Model" && type.indexer) return `Record<${shortType(type.indexer.value)}>`;
  // Anonymous model (inline object)
  if (type.kind === "Model" && !type.name) return "{...}";
  return type.kind;
}

function isBuiltinScalar(type: Type): boolean {
  if (type.kind !== "Scalar") return false;
  const builtins = new Set([
    "string", "boolean", "int8", "int16", "int32", "int64",
    "uint8", "uint16", "uint32", "uint64", "float32", "float64",
    "decimal", "bytes", "utcDateTime", "plainDate", "plainTime",
    "duration", "url", "numeric", "integer", "float",
  ]);
  return builtins.has(type.name);
}

function resolvePropertyType(type: Type): Type {
  // Walk through array element types
  if (type.kind === "Model" && type.indexer && type.name === "Array") {
    return type.indexer.value;
  }
  return type;
}

function collectModel(model: Model) {
  if (!model.name) return; // skip anonymous
  const ns = nsName(model);
  if (SKIP_NS.has(ns)) return;

  const id = `${ns}.${model.name}`;
  const fields: string[] = [];

  for (const [name, prop] of model.properties) {
    const resolved = resolvePropertyType(prop.type);
    const opt = prop.optional ? "?" : "";
    fields.push(`${name}${opt}: ${shortType(prop.type)}`);

    // Edge to referenced type
    const refId = typeId(resolved);
    if (refId && refId !== id && !SKIP_NS.has(refId.split(".")[0])) {
      edges.push({ from: id, to: refId, label: name });
    }

    // Also check if the property type itself (before resolution) points somewhere
    if (prop.type !== resolved) {
      const directId = typeId(prop.type);
      if (directId && directId !== id && !SKIP_NS.has(directId.split(".")[0])) {
        edges.push({ from: id, to: directId, label: `${name} (element)` });
      }
    }

    // Inline model properties -- recurse into anonymous models for edges
    if (prop.type.kind === "Model" && !prop.type.name) {
      for (const [, innerProp] of prop.type.properties) {
        const innerRef = typeId(resolvePropertyType(innerProp.type));
        if (innerRef && !SKIP_NS.has(innerRef.split(".")[0])) {
          edges.push({ from: id, to: innerRef, label: `${name}.${innerProp.name}` });
        }
      }
    }
  }

  // Base model (extends)
  if (model.baseModel) {
    const baseId = typeId(model.baseModel);
    if (baseId && !SKIP_NS.has(baseId.split(".")[0])) {
      edges.push({ from: id, to: baseId, label: "extends" });
    }
  }

  nodes.set(id, { id, label: model.name, kind: "model", namespace: ns, fields });
}

function collectEnum(e: Enum) {
  if (!e.name) return;
  const ns = nsName(e);
  if (SKIP_NS.has(ns)) return;

  const id = `${ns}.${e.name}`;
  const fields: string[] = [];
  for (const [name, member] of e.members) {
    const val = member.value !== undefined ? ` = ${JSON.stringify(member.value)}` : "";
    fields.push(`${name}${val}`);
  }

  nodes.set(id, { id, label: e.name, kind: "enum", namespace: ns, fields });
}

function collectUnion(u: Union) {
  if (!u.name) return;
  const ns = nsName(u);
  if (SKIP_NS.has(ns)) return;

  const id = `${ns}.${u.name}`;
  const fields: string[] = [];

  for (const [name, variant] of u.variants) {
    const typeName = variant.type ? shortType(variant.type) : "void";
    fields.push(`${name ?? typeName}: ${typeName}`);

    // Edge to variant type
    if (variant.type) {
      const refId = typeId(variant.type);
      if (refId && refId !== id && !SKIP_NS.has(refId.split(".")[0])) {
        edges.push({ from: id, to: refId, label: String(name ?? "") });
      }
    }
  }

  nodes.set(id, { id, label: u.name, kind: "union", namespace: ns, fields });
}

function walkNamespace(ns: Namespace) {
  if (SKIP_NS.has(ns.name)) return;

  for (const [, model] of ns.models) collectModel(model);
  for (const [, e] of ns.enums) collectEnum(e);
  for (const [, u] of ns.unions) collectUnion(u);
  for (const [, child] of ns.namespaces) walkNamespace(child);
}

// ── Render dot ─────────────────────────────────────────────────

function renderDot(): string {
  const lines: string[] = [];
  lines.push("digraph TypeSpec {");
  lines.push("  rankdir=LR;");
  lines.push("  node [shape=plaintext fontname=\"Helvetica\" fontsize=10];");
  lines.push("  edge [fontname=\"Helvetica\" fontsize=8 color=\"#666666\"];");
  lines.push("");

  // Group by namespace
  const byNs = new Map<string, NodeInfo[]>();
  for (const node of nodes.values()) {
    if (!byNs.has(node.namespace)) byNs.set(node.namespace, []);
    byNs.get(node.namespace)!.push(node);
  }

  const kindColors: Record<string, { bg: string; header: string }> = {
    model: { bg: "#f8f9fa", header: "#4a90d9" },
    enum: { bg: "#f8f9fa", header: "#6ab04c" },
    union: { bg: "#f8f9fa", header: "#e056a0" },
    scalar: { bg: "#f8f9fa", header: "#f0932b" },
  };

  for (const [ns, nsNodes] of byNs) {
    lines.push(`  subgraph cluster_${dotSafe(ns)} {`);
    lines.push(`    label="${ns}";`);
    lines.push(`    style=dashed;`);
    lines.push(`    color="#999999";`);
    lines.push(`    fontname="Helvetica";`);
    lines.push(`    fontsize=12;`);
    lines.push("");

    for (const node of nsNodes) {
      const colors = kindColors[node.kind] ?? kindColors.model;
      const kindLabel = node.kind.toUpperCase();
      const fieldRows = node.fields
        .map(f => `<TR><TD ALIGN="LEFT" BALIGN="LEFT">${escapeHtml(f)}</TD></TR>`)
        .join("\n            ");

      const htmlLabel = `<
          <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">
            <TR><TD BGCOLOR="${colors.header}"><FONT COLOR="white"><B>${escapeHtml(node.label)}</B> <I>${kindLabel}</I></FONT></TD></TR>
            ${fieldRows || '<TR><TD ALIGN="LEFT"><I>(empty)</I></TD></TR>'}
          </TABLE>
        >`;

      lines.push(`    ${dotSafe(node.id)} [label=${htmlLabel}];`);
    }

    lines.push("  }");
    lines.push("");
  }

  // Deduplicate edges
  const seen = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}:${edge.label ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const fromSafe = dotSafe(edge.from);
    const toSafe = dotSafe(edge.to);
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;

    const labelAttr = edge.label ? ` [label="${escapeHtml(edge.label)}"]` : "";
    lines.push(`  ${fromSafe} -> ${toSafe}${labelAttr};`);
  }

  lines.push("}");
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  const root = resolve(import.meta.dirname!, "..");

  // Compile each package that has a main.tsp
  const packages = ["packages/asyncapi", "packages/decorator-def"];

  for (const pkg of packages) {
    const mainTsp = resolve(root, pkg, "lib/main.tsp");
    try {
      const program = await compile(
        { stat: async () => ({ isDirectory: () => true, isFile: () => false }) } as any,
        mainTsp,
        { noEmit: true },
      );
      const globalNs = program.getGlobalNamespaceType();
      walkNamespace(globalNs);
    } catch {
      // If compile fails, try walking .tsp files manually
      // This is a fallback -- the compiler API is the right way
    }
  }

  // If compiler API is tricky, fall back to direct file parsing
  // For now, try the simpler approach: use the compiler's NodeHost
  if (nodes.size === 0) {
    const { NodeHost } = await import("@typespec/compiler");
    for (const pkg of packages) {
      const mainTsp = resolve(root, pkg, "lib/main.tsp");
      try {
        const program = await compile(NodeHost, mainTsp, { noEmit: true });
        const globalNs = program.getGlobalNamespaceType();
        walkNamespace(globalNs);
      } catch (e: any) {
        process.stderr.write(`Warning: failed to compile ${pkg}: ${e.message}\n`);
      }
    }
  }

  if (nodes.size === 0) {
    process.stderr.write("No types found. Check that tsp files compile.\n");
    process.exit(1);
  }

  process.stdout.write(renderDot() + "\n");
}

main().catch((e) => {
  process.stderr.write(`Error: ${e.message}\n${e.stack}\n`);
  process.exit(1);
});
