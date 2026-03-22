import { Output, render, refkey } from "@alloy-js/core";
import { CrateDirectory } from "../components/3_files/1_CrateDirectory.js";
import { ModDirectory } from "../components/3_files/2_ModDirectory.js";
import { SourceFile } from "../components/3_files/0_SourceFile.js";
import { VisibilityContext } from "../scopes/06_contexts.js";
import { emitTypeDef } from "./02_emit-model.js";
import type { RefkeyRegistry } from "./01_type-map.js";
import type { TypeDef } from "./00_types.js";

export interface CrateEmitOptions {
  modelsModule?: string;
}

export function emitCrate(types: TypeDef[], options: CrateEmitOptions = {}) {
  const modelsModule = options.modelsModule ?? "models";

  // Pre-allocate refkeys for all types so cross-references resolve
  const registry: RefkeyRegistry = new Map();
  for (const t of types) {
    registry.set(t.name, refkey());
  }

  const emitted = types.map(t => emitTypeDef(t, registry, registry.get(t.name)));

  const tree = (
    <Output>
      <VisibilityContext.Provider value="pub">
        <CrateDirectory>
          <ModDirectory name={modelsModule}>
            {emitted.map(e => e.jsx)}
          </ModDirectory>
          <SourceFile path="lib.rs" />
        </CrateDirectory>
      </VisibilityContext.Provider>
    </Output>
  );

  return render(tree);
}
