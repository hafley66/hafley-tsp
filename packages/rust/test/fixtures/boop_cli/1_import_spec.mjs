import { writeFileSync } from "node:fs";
import { orderedCommands } from "./0_help_inputs.mjs";

const ident = name => /^[a-zA-Z_]\w*$/.test(name) && !["model", "namespace", "op", "enum", "scalar", "extends", "is", "valueof", "true", "false"].includes(name) ? name : `\`${name}\``;
const field = value => value.toLowerCase().replace(/[- =|]/g, "_");
const doc = (text, indent = "") => text ? `${indent}/**\n${text.split("\n").map(line => `${indent} * ${line}`).join("\n")}\n${indent} */\n` : "";
const models = new Map();
const enums = new Map();
const records = [];
for (const c of orderedCommands()) {
  const fields = [];
  const used = new Set();
  const add = (row, positional) => {
    if (["--help", "--version"].includes(row.long)) return;
    const label = positional ? row.arg.replace(/[<>\[\]]|\.\.\./g, "") : row.value;
    let name = field(label ?? row.long.slice(2));
    if (used.has(name)) name = field(row.long.slice(2)) + "_flag";
    used.add(name);
    let about = row.about;
    const defaultValue = about.match(/\[default: ([^\]]+)\]/)?.[1];
    const possible = about.match(/\[possible values: ([^\]]+)\]/)?.[1]?.split(", ") ?? [...about.matchAll(/^\s*- ([\w-]+):/gm)].map(m => m[1]);
    about = about.split(/(?:^|\n)\s*Possible values:/)[0].replace(/\s*\[default: [^\]]+\]/g, "").replace(/\s*\[possible values: [^\]]+\]/g, "").split(/\n\s*Possible values:/)[0].trim();
    let type = row.value == null && !positional ? "boolean" : "string";
    if (defaultValue && /^-?\d+$/.test(defaultValue)) type = defaultValue.startsWith("-") ? "int64" : "uint64";
    if (possible.length) {
      const key = possible.join("|");
      if (!enums.has(key)) {
        const enumName = `Values${enums.size}`;
        const members = possible.map(v => {
          const desc = row.about.match(new RegExp(`^\\s*- ${v}:\\s*(.*)$`, "m"))?.[1];
          return doc(desc, "  ") + `  ${ident(v)},`;
        });
        enums.set(key, { name: enumName, text: `enum ${enumName} {\n${members.join("\n")}\n}` });
      }
      type = enums.get(key).name;
    }
    const array = row.multi || (positional && row.arg.endsWith("...")) || /[Rr]epeatable/.test(about);
    if (array) type += "[]";
    const required = positional ? row.arg.startsWith("<") : c.usage.includes(`${row.long} <`);
    const optional = !required && defaultValue === undefined;
    const value = defaultValue === undefined ? "" : ` = ${type.startsWith("Values") ? `${type}.${ident(defaultValue)}` : type === "uint64" || type === "int64" ? defaultValue : JSON.stringify(defaultValue)}`;
    const wire = positional ? `@path(${JSON.stringify("positional_" + name)})` : field(row.long.slice(2)) === name ? "@query" : `@query(${JSON.stringify(row.long.slice(2))})`;
    fields.push({ name, text: doc(about, "  ") + (positional && c.usage.includes(`[-- <${label}>`) ? `  @extension("x-clap-last", true)\n` : "") + (label && label !== name.toUpperCase() ? `  @extension("x-clap-value-name", ${JSON.stringify(label)})\n` : "") + (row.short ? `  @extension("x-clap-short", ${JSON.stringify(row.short.slice(1))})\n` : "") + (positional && required && array ? "  @minItems(1)\n" : "") + `  ${wire} ${ident(name)}${optional ? "?" : ""}: ${type}${value};`, positional, required });
  };
  c.arguments.forEach(r => add(r, true));
  c.options.forEach(r => add(r, false));
  records.push({ c, fields });
}
// Exact shared flag declarations are reusable HTTP models. Each spread occupies
// its original declaration position, so clap's help order follows the source.
const counts = new Map();
for (const { fields } of records) for (const f of fields) if (!f.positional) counts.set(f.text, (counts.get(f.text) ?? 0) + 1);
for (const [text, count] of counts) if (count > 1) models.set(text, `SharedFlags${models.size}`);
const footer = records[0].c.text.slice(records[0].c.text.indexOf("\n\nDOCTRINE") + 2).trimEnd();
let out = `// Imported from boop2 help fixtures. Regenerate with: node 1_import_spec.mjs\nimport "@typespec/http";\nimport "@typespec/openapi";\nusing Http;\nusing OpenAPI;\n\n${doc(records[0].c.about)}@service\n@extension("x-clap-after-help", ${JSON.stringify(footer)})\nnamespace Boop;\n\n`;
out += [...enums.values()].map(v => v.text).join("\n\n") + "\n\n";
out += [...models].map(([text, name]) => `model ${name} {\n${text}\n}`).join("\n\n") + "\n\n";
const emit = (path, indent = "") => {
  const record = records.find(r => r.c.path.join("/") === path.join("/"));
  const { c, fields } = record;
  const children = records.filter(r => r.c.path.length === path.length + 1 && r.c.path.slice(0, -1).join("/") === path.join("/"));
  if (path.length) out += `${indent}@route(${JSON.stringify("/" + path.at(-1))})\n${indent}namespace ${ident(field(path.at(-1)))} {\n`;
  const pad = indent + (path.length ? "  " : "");
  out += doc(c.about, pad);
  if (children.length && fields.length && c.usage.endsWith("<COMMAND>")) out += `${pad}@extension("x-clap-subcommand-required", true)\n`;
  if (c.text.includes(`\n       boop ${path.join(" ")} <COMMAND>`)) out += `${pad}@extension("x-clap-args-conflicts-with-subcommands", true)\n`;
  const parent = records.find(r => r.c.path.join("/") === path.slice(0, -1).join("/"))?.c;
  if (path.length && !parent.subcommands.some(v => v.name === path.at(-1))) out += `${pad}@extension("x-clap-hidden", true)\n`;
  const params = fields.map(f => models.has(f.text) ? `...${models.get(f.text)}` : f.text.trim().replace(/;$/, "")).map(f => f.split("\n").map(line => pad + "  " + line).join("\n"));
  const routeParams = fields.filter(f => f.positional).map(f => `{positional_${f.name}}`).join("/");
  out += `${pad}@route(${JSON.stringify(routeParams ? "/" + routeParams : "/")})\n${pad}@post\n${pad}op ${ident(path.length ? path.join("_").replaceAll("-", "_") : "root")}(\n${params.join(",\n")}\n${pad}): void;\n\n`;
  for (const { c: child } of children) emit(child.path, pad);
  if (path.length) out += `${indent}}\n\n`;
};
emit([]);
writeFileSync(new URL("ops.tsp", import.meta.url), out);
