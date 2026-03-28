// Decorators: bare exports with $ prefix (global scope binding)
export function $timingBefore(ctx, target, ref) {}
export function $timingAfter(ctx, target, ref) {}
export function $timingOn(ctx, target, ref) {}

// Functions: namespaced under $functions
export const $functions = {
  Reflect: {
    dumpOp(ctx, target) {
      console.log("=== dumpOp ===");
      console.log("name:", target.name, "kind:", target.kind);
      if (target.parameters?.kind === "Model") {
        for (const [k, v] of target.parameters.properties) {
          console.log(`  param ${k}: ${v?.type?.kind} ${v?.type?.name || ""}`);
        }
      }
      console.log("returnType:", target.returnType?.kind, target.returnType?.name);
      for (const d of target.decorators || []) {
        const dname = d.decorator?.name;
        const args = d.args
          ?.map((a) => `${a.value?.name}(${a.value?.kind})`)
          .join(", ");
        if (dname && dname !== "$") console.log(`  @${dname}(${args})`);
      }
      return target.returnType;
    },
    dumpNs(ctx, ns) {
      console.log("=== dumpNs ===");
      function walk(n, path) {
        for (const [name, theOp] of n.operations) {
          let params = "?";
          if (theOp.parameters?.kind === "Model") {
            params = [...theOp.parameters.properties]
              .map(([k, v]) => `${k}:${v?.type?.name || v?.type?.kind}`)
              .join(", ");
          }
          const ret = theOp.returnType?.name || theOp.returnType?.kind;
          console.log(`${path}.${name}(${params}) -> ${ret}`);
          for (const d of theOp.decorators || []) {
            const dname = d.decorator?.name;
            const args =
              d.args?.map((a) => a.value?.name || "?").join(", ") || "";
            if (dname && dname !== "$") console.log(`  @${dname}(${args})`);
          }
        }
        for (const [name, child] of n.namespaces) {
          walk(child, `${path}.${name}`);
        }
      }
      walk(ns, ns.name);
      return ns;
    },
    mergeModels(ctx, a, b) {
      return a;
    },
  },
};
