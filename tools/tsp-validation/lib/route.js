const PARAM_KEY = Symbol("routeParam");

// @param decorator: marks a namespace as a dynamic URL segment
export function $param(ctx, target, typeName) {
  ctx.program.stateMap(PARAM_KEY).set(target, typeName);
}

const CRUD_METHODS = {
  create: "POST",
  read: "GET",
  get: "GET",
  delete: "DELETE",
  update: "PUT",
  updatePatch: "PATCH",
};

// ALL CRUD verbs collapse to parent path -- HTTP method is the differentiator.
// Only freeform names append a path segment.
const COLLAPSE_NAMES = new Set(["create", "read", "get", "delete", "update", "updatePatch"]);

// Structural containers: walker descends into these without adding a path segment
const STRUCTURAL_NS = new Set(["query", "mut"]);

// Non-route namespaces: walker skips entirely
const SKIP_NS = new Set(["side", "deps", "flow"]);

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

      // Track whether we're inside a query/ or mut/ container
      function walk(namespace, pathPrefix, paramsAccum, insideContainer) {
        for (const [name, child] of namespace.namespaces) {
          // Skip non-route namespaces entirely
          if (SKIP_NS.has(name)) continue;

          // Dynamic segment: @param("TodoId") etc.
          const paramType = ctx.program.stateMap(PARAM_KEY).get(child);
          if (paramType) {
            const newPath = `${pathPrefix}/{${name}}`;
            const newParams = new Map(paramsAccum);
            newParams.set(name, paramType);
            walk(child, newPath, newParams, null);
            continue;
          }

          // Structural container: descend without adding path segment
          if (STRUCTURAL_NS.has(name)) {
            walk(child, pathPrefix, paramsAccum, name);
            continue;
          }

          // CRUD verb: emit route entry
          if (CRUD_METHODS[name]) {
            const method = CRUD_METHODS[name];
            // read/get collapse to parent path, others append
            const routePath = COLLAPSE_NAMES.has(name)
              ? (pathPrefix || "/")
              : `${pathPrefix}/${name}`;
            entries.push({ path: routePath, params: new Map(paramsAccum), method });
            // CRUD namespaces can have ops inside but we don't recurse for sub-routes
            continue;
          }

          // Inside mut/: freeform action → POST
          if (insideContainer === "mut") {
            entries.push({
              path: `${pathPrefix}/${name}`,
              params: new Map(paramsAccum),
              method: "POST",
            });
            continue;
          }

          // Inside query/: freeform query → GET
          if (insideContainer === "query") {
            entries.push({
              path: `${pathPrefix}/${name}`,
              params: new Map(paramsAccum),
              method: "GET",
            });
            continue;
          }

          // Regular path segment: recurse
          walk(child, `${pathPrefix}/${name}`, paramsAccum, null);
        }
      }

      walk(ns, "", new Map(), null);

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
          // pType is the decorator argument (e.g. "TodoId", "string").
          // Params are always strings at the URL level; store the scalar name as metadata.
          const tsType = ck.getStdType("string");
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

        // Add as property on outer model, keyed by "METHOD /path" for uniqueness
        const routeKey = `${entry.method} ${entry.path}`;
        const routeProp = ck.createType({
          kind: "ModelProperty", name: routeKey,
          type: entryModel, optional: false,
          decorators: [], model: outerModel,
        });
        outerModel.properties.set(routeKey, routeProp);
      }

      ck.finishType(outerModel);

      // Log what we built
      for (const [key, prop] of outerModel.properties) {
        const entry = prop.type;
        const params = [...(entry.properties.get("params")?.type?.properties?.keys() || [])];
        console.log(`  ${key}${params.length ? `  params: {${params.join(", ")}}` : ""}`);
      }

      return outerModel;
    },
  },
};
