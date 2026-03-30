import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";

const PARAM_KEY = Symbol("routeParam");
const DIRTY_FILE = ".tsp-dirty";
const ZONE_START = "// --- AUTOZONE START (do not edit) ---";
const ZONE_END = "// --- AUTOZONE END ---";

export function $param(ctx, target, typeName) {
  ctx.program.stateMap(PARAM_KEY).set(target, typeName);
}

function walkRoutes(ctx, ns, pathPrefix, paramsAccum) {
  const entries = [];
  const CRUD = { create: "POST", read: "GET", delete: "DELETE", update: "PUT", updatePatch: "PATCH" };

  for (const [name, child] of ns.namespaces) {
    const paramType = ctx.program.stateMap(PARAM_KEY).get(child);
    if (paramType) {
      entries.push(...walkRoutes(ctx, child, `${pathPrefix}/{${name}}`, new Map([...paramsAccum, [name, paramType]])));
      continue;
    }
    if (CRUD[name]) {
      const routePath = name === "read" ? (pathPrefix || "/") : `${pathPrefix}/${name}`;
      entries.push({ path: routePath, params: new Map(paramsAccum), method: CRUD[name] });
      continue;
    }
    entries.push(...walkRoutes(ctx, child, `${pathPrefix}/${name}`, paramsAccum));
  }
  return entries;
}

function entriesToTsp(entries) {
  let out = `namespace Routes {\n`;

  for (const entry of entries) {
    const safeName = "`" + entry.path + "`";
    out += `  namespace ${safeName} {\n`;
    out += `    alias template = "${entry.path}";\n`;
    out += `    alias method = "${entry.method}";\n`;
    if (entry.params.size > 0) {
      out += `    namespace params {\n`;
      for (const [pName, pType] of entry.params) {
        out += `      alias ${pName} = ${pType};\n`;
      }
      out += `    }\n`;
    }
    out += `  }\n`;
  }

  out += `}`;
  return out;
}

function getSourceFilePath(callNode) {
  let parent = callNode.parent;
  while (parent) {
    if (parent.file) return parent.file.path;
    if (parent.path) return parent.path;
    parent = parent.parent;
  }
  return null;
}

function injectAutozone(filePath, generated, dirtyPath) {
  const source = readFileSync(filePath, "utf8");
  const zoneContent = `${ZONE_START}\n${generated}\n${ZONE_END}`;

  const startIdx = source.indexOf(ZONE_START);
  const endIdx = source.indexOf(ZONE_END);

  let newSource;
  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing autozone
    newSource = source.slice(0, startIdx) + zoneContent + source.slice(endIdx + ZONE_END.length);
  } else {
    // First run: append autozone after the last line
    newSource = source.trimEnd() + "\n\n" + zoneContent + "\n";
  }

  if (newSource === source) {
    console.log("[codegen] autozone unchanged (clean)");
    if (existsSync(dirtyPath)) unlinkSync(dirtyPath);
    return false;
  }

  writeFileSync(filePath, newSource);
  writeFileSync(dirtyPath, `pass at ${new Date().toISOString()}`);
  console.log("[codegen] autozone updated (dirty)");
  return true;
}

export const $functions = {
  Codegen: {
    generateRoutes(ctx, ns) {
      const callNode = ctx.functionCallTarget;
      const filePath = getSourceFilePath(callNode);

      if (!filePath) {
        console.log("[codegen] ERROR: could not resolve source file from call site");
        return ns;
      }

      const entries = walkRoutes(ctx, ns, "", new Map());
      const generated = entriesToTsp(entries);

      const dirtyPath = resolve(dirname(filePath), DIRTY_FILE);
      const dirty = injectAutozone(filePath, generated, dirtyPath);

      if (dirty) {
        for (const e of entries) {
          console.log(`  ${e.method.padEnd(6)} ${e.path}`);
        }
      }

      return ns;
    }
  }
};
