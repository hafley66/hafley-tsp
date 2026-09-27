import { Output, render, SourceFile, type OutputDirectory } from "@alloy-js/core";
import { AutoZone, CrateDirectory, ManualZone, ReplaceFile, VisibilityContext } from "@hafley66/alloy-rs";
import type { Program } from "@typespec/compiler";
import { SqlxRowStructs, sqlxStorage, type SqlxStorageOptions, type SqlxStorageParts } from "./3_storage.js";

export function emitSqlxRust(
  program: Program,
  existingFile?: string,
  options: Omit<SqlxStorageOptions, "existingFile"> = {},
): OutputDirectory {
  return emitSqlxRustFromStorage(sqlxStorage(program, { ...options, existingFile }), existingFile);
}

export function emitSqlxRustFromStorage(storage: SqlxStorageParts, existingFile?: string): OutputDirectory {
  const tree = (
    <Output>
      <VisibilityContext.Provider value="pub">
        <CrateDirectory>
          {storage.internFile !== undefined && <SourceFile path="intern_auto.rs" filetype="rust">{storage.internFile}</SourceFile>}
          <ReplaceFile path="generated.rs" existingFile={existingFile}>
            <AutoZone id="imports">
              {"use anyhow::Result;\nuse serde::{Deserialize, Serialize};\nuse sqlx::SqliteConnection;\n"}
              {storage.interned.entities.length > 0 && "pub mod intern_auto;\npub use intern_auto::*;\n"}
            </AutoZone>
            <AutoZone id="row-structs"><SqlxRowStructs storage={storage} /></AutoZone>
            <AutoZone id="upsert-fns">{storage.upsertSections.join("\n\n")}</AutoZone>
            <ManualZone>{"// Custom code below this line is preserved across re-generation.\n"}</ManualZone>
          </ReplaceFile>
        </CrateDirectory>
      </VisibilityContext.Provider>
    </Output>
  );
  return render(tree);
}
