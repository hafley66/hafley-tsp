import { readFileSync } from "node:fs";
import { join } from "node:path";

export const fixtureDir = process.env.BOOP_HELP_FIXTURES ?? "/Users/chrishafley/projects/boop2/fixtures/help";
export const tree = JSON.parse(readFileSync(join(fixtureDir, "tree.json"), "utf8"));

// tree.json supplies paths and row spellings. The text supplies paragraphs that
// the tree capture omits when clap lays a description out below its flag.
export function rows(text, heading) {
  const section = text.split(`${heading}:\n`)[1]?.split(/\n(?=[A-Z][A-Za-z ]+:)/)[0] ?? "";
  const lines = section.split("\n");
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^ {2,6}\S/.test(lines[i])) continue;
    const match = lines[i].trim().match(heading === "Options"
      ? /^(?:(-\w), )?(--[\w-]+)(?:[ =]<([^>]+)>(\.\.\.)?)?(?: {2,}(.*))?$/
      : /^([<\[][A-Z0-9_= -]+[>\]](?:\.\.\.)?)(?: {2,}(.*))?$/);
    if (!match) continue;
    const body = [match.at(-1) ?? ""];
    while (i + 1 < lines.length && !/^ {2,6}\S/.test(lines[i + 1]) && !/^\S/.test(lines[i + 1])) {
      body.push(lines[++i].replace(/^ {10}/, ""));
    }
    result.push(heading === "Options"
      ? { short: match[1], long: match[2], value: match[3], multi: !!match[4], about: body.join("\n").trim() }
      : { arg: match[1], about: body.join("\n").trim() });
  }
  return result;
}

export const commands = Object.values(tree).map(command => {
  const text = readFileSync(join(fixtureDir, command.file), "utf8");
  const options = rows(text, "Options");
  const args = rows(text, "Arguments");
  return { ...command, about: text.startsWith("Usage:") ? "" : text.split("\n\nUsage:")[0], text, options: command.options.map(o => ({ ...o, ...options.find(r => r.long === o.long) })), arguments: command.arguments.map(a => ({ ...a, ...args.find(r => r.arg === a.arg) })) };
});

// Parent help defines registration order. Hidden children retain tree order.
export function orderedCommands() {
  const result = [];
  const walk = path => {
    const command = commands.find(c => c.path.join("/") === path.join("/"));
    if (!command) throw new Error(`Missing help for ${path.join("/")}`);
    result.push(command);
    const children = commands.filter(c => c.path.length === path.length + 1 && c.path.slice(0, -1).join("/") === path.join("/"));
    for (const c of command.subcommands) {
      const child = children.find(v => v.path.at(-1) === c.name);
      if (child) walk(child.path);
    }
    for (const child of children) if (!command.subcommands.some(c => c.name === child.path.at(-1))) walk(child.path);
  };
  walk([]);
  return result;
}
