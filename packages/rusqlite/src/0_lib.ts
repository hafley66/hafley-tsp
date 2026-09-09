import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@hafley/typespec-rusqlite",
  diagnostics: {
    "invalid-rusqlite": {
      severity: "error",
      messages: { default: paramMessage`Invalid rusqlite storage declaration: ${"reason"}` },
    },
    "conflicting-auto-emitters": {
      severity: "error",
      messages: { default: paramMessage`Conflicting automatic emitters imported: ${"owners"}` },
    },
  },
});

export const { reportDiagnostic: reportRusqliteDiagnostic, createDiagnostic: createRusqliteDiagnostic } = $lib;
