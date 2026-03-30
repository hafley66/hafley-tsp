import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@hafley/typespec-binding-core",
  diagnostics: {
    "dot-path-must-be-nullable": {
      severity: "error",
      messages: {
        default: paramMessage`Dot-path field "${"name"}" must be nullable -- any intermediate node in the source could be null.`,
      },
    },
    "unmapped-field": {
      severity: "warning",
      messages: {
        default: paramMessage`Field "${"name"}" on "${"model"}" has no source mapping and no @Entity.manual marker.`,
      },
    },
    "invalid-binding-chain": {
      severity: "error",
      messages: {
        default: paramMessage`Binding chain for "${"field"}" is invalid: ${"reason"}`,
      },
    },
    "duplicate-pk": {
      severity: "error",
      messages: {
        default: paramMessage`Model "${"model"}" has multiple @Entity.pk fields.`,
      },
    },
  },
  state: {
    pk: { description: "State for @Entity.pk decorator" },
    unique: { description: "State for @Entity.unique decorator" },
    manual: { description: "State for @Entity.manual decorator" },
    index: { description: "State for @Entity.index decorator" },
    default: { description: "State for @Entity.default decorator" },
    relation: { description: "State for @Rel.* decorators" },
    binding: { description: "State for @Bind.from decorator" },
    sourceGraphql: { description: "State for @Source.graphql decorator" },
    sourceRest: { description: "State for @Source.rest decorator" },
    sourcePaginated: { description: "State for @Source.paginated decorator" },
    sourceNested: { description: "State for @Source.nested decorator" },
    sourcePollInterval: { description: "State for @Source.pollInterval decorator" },
    syncStrategy: { description: "State for @Sync.strategy decorator" },
  },
});

export const { reportDiagnostic, createDiagnostic, stateKeys: BindingCoreStateKeys } = $lib;
