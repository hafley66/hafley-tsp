import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@hafley/typespec-sqlx",
  diagnostics: {
    "invalid-sqlx": {
      severity: "error",
      messages: { default: paramMessage`Invalid SQLx storage declaration: ${"reason"}` },
    },
    "conflicting-auto-emitters": {
      severity: "error",
      messages: { default: paramMessage`Conflicting automatic emitters imported: ${"owners"}` },
    },
  },
});

export const { reportDiagnostic: reportSqlxDiagnostic, createDiagnostic: createSqlxDiagnostic } = $lib;
