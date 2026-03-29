const PARAM_KEY = Symbol("routeParam");

// @param decorator: marks a namespace as a dynamic URL segment
export function $param(ctx, target, typeName) {
  ctx.program.stateMap(PARAM_KEY).set(target, typeName);
}

const CRUD_METHODS = {
  create: "POST",
  read: "GET",
  delete: "DELETE",
  update: "PUT",
  updatePatch: "PATCH",
};

export const $functions = {
  Route: {
    // path("template") → Model with string properties for each {param}
    path(ctx, template) {
      const ck = ctx.program.checker;
      const params = [];
      const regex = /\{(\w+)\}/g;
      let match;
      while ((match = regex.exec(template)) !== null) {
        params.push(match[1]);
      }

      const model = ck.createType({
        kind: "Model", name: "", properties: new Map(),
        decorators: [], derivedModels: [], sourceModels: [],
      });
      for (const paramName of params) {
        const prop = ck.createType({
          kind: "ModelProperty", name: paramName,
          type: ck.getStdType("string"), optional: false,
          decorators: [], model,
        });
        model.properties.set(paramName, prop);
      }
      ck.finishType(model);
      return model;
    },

    // flattenRoutes(ns) → Model keyed by path strings, values are route entry models
    flattenRoutes(ctx, ns) {
      const ck = ctx.program.checker;
      const entries = []; // { path, params: Map<name, typeString>, method }

      function walk(namespace, pathPrefix, paramsAccum) {
        for (const [name, child] of namespace.namespaces) {
          // Dynamic segment: @param("string")
          const paramType = ctx.program.stateMap(PARAM_KEY).get(child);
          if (paramType) {
            const newPath = `${pathPrefix}/{${name}}`;
            const newParams = new Map(paramsAccum);
            newParams.set(name, paramType);
            walk(child, newPath, newParams);
            continue;
          }

          // CRUD verb: emit route entry
          if (CRUD_METHODS[name]) {
            const method = CRUD_METHODS[name];
            // read collapses to parent path, others append
            const routePath = name === "read"
              ? (pathPrefix || "/")
              : `${pathPrefix}/${name}`;
            entries.push({ path: routePath, params: new Map(paramsAccum), method });
            continue;
          }

          // Regular path segment: recurse
          walk(child, `${pathPrefix}/${name}`, paramsAccum);
        }
      }

      walk(ns, "", new Map());

      // Build outer model: each property keyed by path string
      const outerModel = ck.createType({
        kind: "Model", name: "", properties: new Map(),
        decorators: [], derivedModels: [], sourceModels: [],
      });

      for (const entry of entries) {
        // Build params sub-model
        const paramsModel = ck.createType({
          kind: "Model", name: "", properties: new Map(),
          decorators: [], derivedModels: [], sourceModels: [],
        });
        for (const [pName, pType] of entry.params) {
          const tsType = ck.getStdType(pType);
          const paramProp = ck.createType({
            kind: "ModelProperty", name: pName,
            type: tsType, optional: false,
            decorators: [], model: paramsModel,
          });
          paramsModel.properties.set(pName, paramProp);
        }
        ck.finishType(paramsModel);

        // Build route entry model: { template, params, method }
        const entryModel = ck.createType({
          kind: "Model", name: "", properties: new Map(),
          decorators: [], derivedModels: [], sourceModels: [],
        });

        // template: string literal type
        const templateType = ck.createLiteralType(entry.path);
        const templateProp = ck.createType({
          kind: "ModelProperty", name: "template",
          type: templateType, optional: false,
          decorators: [], model: entryModel,
        });
        entryModel.properties.set("template", templateProp);

        // params: model
        const paramsProp = ck.createType({
          kind: "ModelProperty", name: "params",
          type: paramsModel, optional: false,
          decorators: [], model: entryModel,
        });
        entryModel.properties.set("params", paramsProp);

        // method: string literal type
        const methodType = ck.createLiteralType(entry.method);
        const methodProp = ck.createType({
          kind: "ModelProperty", name: "method",
          type: methodType, optional: false,
          decorators: [], model: entryModel,
        });
        entryModel.properties.set("method", methodProp);

        ck.finishType(entryModel);

        // Add as property on outer model
        const routeProp = ck.createType({
          kind: "ModelProperty", name: entry.path,
          type: entryModel, optional: false,
          decorators: [], model: outerModel,
        });
        outerModel.properties.set(entry.path, routeProp);
      }

      ck.finishType(outerModel);

      // Log what we built
      for (const [path, prop] of outerModel.properties) {
        const entry = prop.type;
        const method = entry.properties.get("method")?.type?.value || "?";
        const params = [...(entry.properties.get("params")?.type?.properties?.keys() || [])];
        console.log(`  ${method.padEnd(6)} ${path}${params.length ? `  params: {${params.join(", ")}}` : ""}`);
      }

      return outerModel;
    },
  },
};
