import type { OutputDirectory } from "@alloy-js/core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// User-owned stubs: written once, never overwritten.
export const USER_OWNED_FILES = new Set(["ops.rs"]);

export function writeCrate(root: OutputDirectory, dir: string): string[] {
  const written: string[] = [];
  const walk = (node: OutputDirectory) => {
    for (const item of node.contents) {
      if (item.kind === "directory") {
        walk(item);
        continue;
      }
      if (!("contents" in item)) continue;
      const target = join(dir, item.path);
      if (USER_OWNED_FILES.has(basename(item.path)) && existsSync(target)) continue;
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, item.contents);
      written.push(item.path);
    }
  };
  walk(root);
  return written;
}
