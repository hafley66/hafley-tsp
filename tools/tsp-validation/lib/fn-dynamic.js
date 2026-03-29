// Dynamic function factory: register JS functions as callable TSP functions at compile time

const REGISTRY = new Map(); // name -> js function

export const $functions = {
  FnDynamic: {
    // Register a dynamic function into the registry
    // Called early (via alias) to set up functions before they're used
    registerFn(ctx, name) {
      console.log(`=== registerFn("${name}") ===`);

      // Create a JS function that builds a model with a field named after the input
      const impl = (innerCtx, fieldName) => {
        console.log(`  [dynamic:${name}] called with fieldName="${fieldName}"`);
        const ck = innerCtx.program.checker;
        const model = ck.createType({
          kind: "Model", name: `${name}_result`, properties: new Map(),
          decorators: [], derivedModels: [], sourceModels: [],
        });
        const prop = ck.createType({
          kind: "ModelProperty", name: fieldName,
          type: ck.getStdType("string"), optional: false,
          decorators: [], model,
        });
        model.properties.set(fieldName, prop);
        ck.finishType(model);
        return model;
      };

      REGISTRY.set(name, impl);
      console.log(`  registered "${name}", registry size: ${REGISTRY.size}`);

      // Try to add it to a namespace's functionDeclarations
      const globalNs = ctx.program.getGlobalNamespaceType();
      const fnDynNs = globalNs.namespaces.get("FnDynamic");
      if (fnDynNs) {
        // Inspect existing fn declaration to understand the shape
        const existingFn = fnDynNs.functionDeclarations.get("registerFn");
        if (existingFn) {
          console.log("  existing fn shape:");
          for (const [k, v] of Object.entries(existingFn)) {
            console.log(`    ${k}: ${v?.kind || v?.valueKind || typeof v}`);
          }

          // Clone the structure but with new implementation
          const dynamicDecl = {
            ...existingFn,
            name: name,
            implementation: impl,
          };
          fnDynNs.functionDeclarations.set(name, dynamicDecl);
          console.log(`  added "${name}" to FnDynamic.functionDeclarations`);
          console.log(`  fn decls: [${[...fnDynNs.functionDeclarations.keys()].join(", ")}]`);
        }
      }

      // Return empty model (registration is the side effect)
      const ck = ctx.program.checker;
      const m = ck.createType({
        kind: "Model", name: "", properties: new Map(),
        decorators: [], derivedModels: [], sourceModels: [],
      });
      ck.finishType(m);
      return m;
    },

    // Call a dynamically registered function by name
    callDynamic(ctx, name, arg) {
      console.log(`=== callDynamic("${name}", "${arg}") ===`);
      const fn = REGISTRY.get(name);
      if (!fn) {
        console.log(`  ERROR: "${name}" not in registry`);
        const ck = ctx.program.checker;
        const m = ck.createType({
          kind: "Model", name: "", properties: new Map(),
          decorators: [], derivedModels: [], sourceModels: [],
        });
        ck.finishType(m);
        return m;
      }
      // Call it via ctx.callFunction
      const result = ctx.callFunction(fn, arg);
      console.log(`  result: kind=${result?.kind} props=[${result?.properties ? [...result.properties.keys()].join(",") : "?"}]`);
      return result;
    },

    // Direct test: create and immediately call via ctx.callFunction
    createAndCall(ctx, name) {
      console.log(`=== createAndCall("${name}") ===`);

      const dynamicFn = (innerCtx, ...args) => {
        console.log(`  [inline:${name}] called, args:`, args.map(a => typeof a === 'string' ? a : a?.kind).join(", "));
        const ck = innerCtx.program.checker;
        const model = ck.createType({
          kind: "Model", name: `created_by_${name}`, properties: new Map(),
          decorators: [], derivedModels: [], sourceModels: [],
        });
        const prop = ck.createType({
          kind: "ModelProperty", name: "proof",
          type: ck.getStdType("string"), optional: false,
          decorators: [], model,
        });
        model.properties.set("proof", prop);
        ck.finishType(model);
        return model;
      };

      // Call it directly
      const result = ctx.callFunction(dynamicFn);
      console.log(`  result: kind=${result?.kind} name=${result?.name} props=[${[...result.properties.keys()].join(",")}]`);
      return result;
    },
  },
};
