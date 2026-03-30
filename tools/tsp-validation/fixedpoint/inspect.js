function dumpModelInner(ctx, model, indent = "") {
  console.log(`${indent}[model] ${model.name || "(anon)"}`);
  for (const [name, prop] of model.properties) {
    let t = prop.type;
    if (t.kind === "ModelProperty") t = t.type;
    if (t.kind === "Model") {
      console.log(`${indent}  ${name}: Model ↓`);
      dumpModelInner(ctx, t, indent + "    ");
    } else if (t.kind === "Scalar") {
      console.log(`${indent}  ${name}: Scalar(${t.name}) extends ${t.baseScalar?.name || "?"}`);
    } else {
      console.log(`${indent}  ${name}: ${t.kind}(${t.name || "?"})`);
    }
  }
  return model;
}

export const $functions = {
  Inspect: {
    dumpModel(ctx, model) {
      return dumpModelInner(ctx, model, "");
    }
  }
};
