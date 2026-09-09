import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { getSourceLocation, type Program, type Type } from "@typespec/compiler";
import type { InternStorage } from "./3_intern.js";

export function autoFile(
  program: Program,
  sourceTypes: Type[],
  body: string,
  existingFile?: string,
  fileName = "intern_auto.rs",
  comment = "//",
): string | undefined {
  const sources = new Map(sourceTypes.map((type) => {
    const file = getSourceLocation(type).file;
    return [relative(program.projectRoot, file.path), file.text];
  }));
  const ordered = [...sources].sort(([left], [right]) => left.localeCompare(right));
  const hash = createHash("sha256").update(JSON.stringify(ordered)).update(body).digest("hex");
  if (existingFile) {
    try {
      const old = readFileSync(join(dirname(existingFile), fileName), "utf8");
      const marker = `${comment} Body\n`;
      const start = old.indexOf(marker);
      if (start >= 0 && old.slice(start + marker.length).trimEnd() === body.trimEnd()) return undefined;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return `${comment} Rendered: ${new Date().toISOString()}\n${comment} Input SHA-256: ${hash}\n${comment} Sources: ${ordered.map(([path]) => path).join(", ")}\n${comment} Body\n${body}`;
}

export function internAutoFile(
  program: Program,
  storage: InternStorage,
  body: string,
  existingFile?: string,
  fileName = "intern_auto.rs",
  comment = "//",
): string | undefined {
  return autoFile(program, [...storage.domains.map((domain) => domain.scalar), ...storage.entities.map((entity) => entity.model)], body, existingFile, fileName, comment);
}
