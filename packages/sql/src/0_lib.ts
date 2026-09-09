import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@hafley/typespec-sql",
  diagnostics: {
    "invalid-intern": {
      severity: "error",
      messages: { default: paramMessage`Invalid interning declaration: ${"reason"}` },
    },
  },
  state: {
    intern: { description: "String scalar interning domains" },
    pk: { description: "State for @Entity.pk decorator" },
    unique: { description: "State for @Entity.unique decorator" },
    manual: { description: "State for @Entity.manual decorator" },
    index: { description: "State for @Entity.index decorator" },
    default: { description: "State for @Entity.default decorator" },
    relation: { description: "State for @Rel.* decorators" },
  },
});

export const { reportDiagnostic: reportSqlDiagnostic, createDiagnostic: createSqlDiagnostic, stateKeys } = $lib;
export const RelationStateKey = Symbol.for("hafley:relations");
export const SqlStateKeys = { ...stateKeys, relation: RelationStateKey };
