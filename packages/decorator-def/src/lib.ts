import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@hafley/typespec-decorator-def",
  diagnostics: {},
  state: {
    decoratorDef: { description: "State for @decoratorDef decorator" },
    clap: { description: "Clap argument and command metadata" },
    daemon: { description: "Per-user daemon transport settings" },
  },
});

export const { stateKeys: DecoratorDefStateKeys } = $lib;
