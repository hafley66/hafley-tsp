import { Output, render, SourceFile, type OutputDirectory } from "@alloy-js/core";
import { AutoZone, CrateDirectory, ManualZone, ReplaceFile, VisibilityContext } from "@hafley/alloy-rs";
import type { Program } from "@typespec/compiler";
import { emitWriteConnectionTrait } from "./2_intern_writer.js";
import { RusqliteRowStructs, rusqliteStorage, type RusqliteStorageOptions, type RusqliteStorageParts } from "./3_storage.js";

export function emitRusqliteRust(
  program: Program,
  existingFile?: string,
  options: Omit<RusqliteStorageOptions, "existingFile"> = {},
): OutputDirectory {
  return emitRusqliteRustFromStorage(rusqliteStorage(program, { ...options, existingFile }), existingFile);
}

export function emitRusqliteRustFromStorage(storage: RusqliteStorageParts, existingFile?: string): OutputDirectory {
  return render(
    <Output>
      <VisibilityContext.Provider value="pub">
        <CrateDirectory>
          {storage.internFile !== undefined && <SourceFile path="intern_auto.rs" filetype="rust">{storage.internFile}</SourceFile>}
          <ReplaceFile path="generated.rs" existingFile={existingFile}>
            <AutoZone id="imports">
              {"use rusqlite::{Connection, OptionalExtension, params};\nuse serde::{Deserialize, Serialize};\n"}
              {storage.interned.entities.length > 0 && "pub mod intern_auto;\npub use intern_auto::*;\n"}
            </AutoZone>
            <AutoZone id="row-structs"><RusqliteRowStructs storage={storage} /></AutoZone>
            <AutoZone id="upsert-fns">{emitWriteConnectionTrait()}{storage.writerSections.length > 0 && "\n\n"}{storage.writerSections.join("\n\n")}</AutoZone>
            <ManualZone>{"// Custom code below this line is preserved across re-generation.\n"}</ManualZone>
          </ReplaceFile>
        </CrateDirectory>
      </VisibilityContext.Provider>
    </Output>,
  );
}
