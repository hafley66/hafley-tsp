import type { Program } from "@typespec/compiler";

export const AutoEmitterMarker = "$hafleyAutoEmitter";

export function loadedAutoEmitters(program: Program): string[] {
  const owners = new Set<string>();
  for (const source of program.jsSourceFiles.values()) {
    const owner = source.esmExports?.[AutoEmitterMarker];
    if (typeof owner === "string") owners.add(owner);
  }
  return [...owners].sort();
}
