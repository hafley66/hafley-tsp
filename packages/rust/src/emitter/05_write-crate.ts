import type { OutputDirectory } from "@alloy-js/core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// User-owned stubs: written once, never overwritten.
export const USER_OWNED_FILES = new Set(["ops.rs"]);

// `routes` maps a top-level entry ("models", "client_auto.rs") to a path under `dir`.
// With routes, an entry that has none is not written.
export function writeCrate(root: OutputDirectory, dir: string, routes?: Record<string, string>): string[] {
  const written: string[] = [];
  const walk = (node: OutputDirectory) => {
    for (const item of node.contents) {
      if (item.kind === "directory") {
        walk(item);
        continue;
      }
      if (!("contents" in item)) continue;
      const [entry, ...rest] = item.path.split("/");
      if (routes && !(entry in routes)) continue;
      const target = routes ? join(dir, routes[entry], ...rest) : join(dir, item.path);
      if (USER_OWNED_FILES.has(basename(item.path)) && existsSync(target)) continue;
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, item.contents);
      written.push(item.path);
    }
  };
  walk(root);
  return written;
}
