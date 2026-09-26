import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@hafley/typespec-decorator-def",
  diagnostics: {},
  state: {
    decoratorDef: { description: "State for @decoratorDef decorator" },
    clap: { description: "Clap argument and command metadata" },
  },
});

export const { stateKeys: DecoratorDefStateKeys } = $lib;
