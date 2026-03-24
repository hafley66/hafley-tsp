import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@hafley/typespec-decorator-def",
  diagnostics: {},
  state: {
    decoratorDef: { description: "State for @decoratorDef decorator" },
  },
});

export const { stateKeys: DecoratorDefStateKeys } = $lib;
