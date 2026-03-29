export const $functions = {
  FnReturn: {
    makeModel(ctx, fieldName) {
      const ck = ctx.program.checker;
      const model = ck.createType({
        kind: "Model",
        name: "",
        properties: new Map(),
        decorators: [],
        derivedModels: [],
        sourceModels: [],
      });

      const prop = ck.createType({
        kind: "ModelProperty",
        name: fieldName,
        type: ck.getStdType("string"),
        optional: false,
        decorators: [],
        model: model,
      });
      model.properties.set(fieldName, prop);
      ck.finishType(model);

      console.log(`makeModel("${fieldName}") -> {${[...model.properties.keys()].join(", ")}}`);
      return model;
    },

    addField(ctx, model, fieldName) {
      const ck = ctx.program.checker;

      // What did we receive as 'model'?
      console.log("=== addField ===");
      console.log("  model arg kind:", model?.kind);
      console.log("  model arg name:", model?.name);
      if (model?.properties) {
        console.log("  existing props:", [...model.properties.keys()].join(", "));
      } else {
        console.log("  model has no properties, full keys:", Object.keys(model || {}));
      }
      console.log("  fieldName:", fieldName);

      // Can we mutate the existing model?
      // Or do we need to create a new one with all old props + new prop?

      // Try creating a new model with old props copied
      const newModel = ck.createType({
        kind: "Model",
        name: "",
        properties: new Map(),
        decorators: [],
        derivedModels: [],
        sourceModels: [],
      });

      // Copy existing properties
      if (model?.properties) {
        for (const [k, v] of model.properties) {
          const copiedProp = ck.createType({
            kind: "ModelProperty",
            name: k,
            type: v.type,
            optional: v.optional,
            decorators: [],
            model: newModel,
          });
          newModel.properties.set(k, copiedProp);
        }
      }

      // Add new field
      const newProp = ck.createType({
        kind: "ModelProperty",
        name: fieldName,
        type: ck.getStdType("string"),
        optional: false,
        decorators: [],
        model: newModel,
      });
      newModel.properties.set(fieldName, newProp);
      ck.finishType(newModel);

      console.log(`  result: {${[...newModel.properties.keys()].join(", ")}}`);
      return newModel;
    },

    curry(ctx, fieldName) {
      // Can we return a JS function that TSP can call?
      console.log("=== curry ===");
      console.log("  fieldName:", fieldName);

      // Try returning a function
      const fn = (secondField) => {
        console.log("  curry inner called with:", secondField);
        return secondField;
      };
      console.log("  returning function:", typeof fn);
      return fn;
    },
  },
};
