import { REL_KEY } from "./state.js";

// $onValidate runs after ALL types are checked -- decorators have fired.
export function $onValidate(program) {
  const relMap = program.stateMap(REL_KEY);
  const edges = [];

  // relMap keyed by model name string → [{property, kind, targetType}]
  for (const [modelName, rels] of relMap) {
    for (const rel of rels) {
      let t = rel.targetType;
      if (t?.kind === "Model" && t.indexer?.value) t = t.indexer.value;
      edges.push({
        from: modelName,
        to: t?.name || "?",
        kind: rel.kind,
        via: rel.property
      });
    }
  }

  const entityNames = new Set();
  for (const e of edges) {
    entityNames.add(e.from);
    entityNames.add(e.to);
  }

  console.log("\n  ╔══ ENTITY-RELATION GRAPH ══════════════════════╗");
  console.log("  ║");
  console.log("  ║  ENTITIES: " + [...entityNames].join(", "));
  console.log("  ║");

  if (edges.length > 0) {
    console.log("  ║  EDGES:");
    for (const edge of edges) {
      const arrow = edge.kind === "manyToMany" ? " ╌╌M:M╌╌ " :
                    edge.kind === "hasMany"    ? " ──1:M──→ " :
                    edge.kind === "belongsTo"  ? " ──M:1──→ " :
                    edge.kind === "hasOne"     ? " ──1:1──→ " : " ──?──→ ";
      console.log(`  ║    ${edge.from}${arrow}${edge.to}  (.${edge.via})`);
    }
  }

  // Detect cycles
  const visited = new Set();
  const inStack = new Set();
  const cycles = [];
  function dfs(node, path) {
    if (inStack.has(node)) {
      const i = path.indexOf(node);
      if (i >= 0) cycles.push(path.slice(i).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    for (const e of edges.filter(e => e.from === node)) {
      dfs(e.to, [...path, node]);
    }
    inStack.delete(node);
  }
  for (const name of entityNames) {
    visited.clear();
    inStack.clear();
    dfs(name, []);
  }
  if (cycles.length > 0) {
    console.log("  ║");
    console.log("  ║  CYCLES:");
    const seen = new Set();
    for (const c of cycles) {
      const key = [...new Set(c)].sort().join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  ║    ${c.join(" → ")}`);
    }
  }

  // Route implications
  console.log("  ║");
  console.log("  ║  ROUTE IMPLICATIONS:");
  for (const e of edges) {
    const src = e.from.toLowerCase() + "s";
    if (e.kind === "belongsTo") {
      console.log(`  ║    M:1  GET /${src}/{id}/${e.via}  (query field, not sub-resource)`);
    } else if (e.kind === "hasMany") {
      console.log(`  ║    1:M  GET /${src}/{id}/${e.via}  (sub-resource folder)`);
    } else if (e.kind === "manyToMany") {
      console.log(`  ║    M:M  GET /${src}/{id}/${e.via}  (junction: link/unlink)`);
    }
  }

  console.log("  ║");
  console.log("  ╚═══════════════════════════════════════════════╝\n");
}
