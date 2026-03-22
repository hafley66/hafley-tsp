// Extracts RouteDef[] from a compiled TypeSpec program.
// Reads an AppRoutes model where each property key is a path literal
// and each value is Route<Component<TProps, TState, TEvents>>.

import type { Model, Union, Program, Namespace } from "@typespec/compiler";
import type { RouteDef } from "./00_types.js";

// Convert a path like "/users/$userId" to TanStack Router file name "users.$userId"
// Root "/" becomes "index"
function pathToFileName(path: string): string {
  if (path === "/") return "index";
  return path
    .replace(/^\//, "")   // strip leading slash
    .replace(/\//g, ".");  // slashes become dots
}

// Derive a component name from the state model name.
// "DashboardState" -> "Dashboard", "UserDetailState" -> "UserDetail"
function stateNameToComponentName(stateName: string): string {
  return stateName.replace(/State$/, "");
}

// Extract routes from a model whose properties are Route<Component<P, S, E>>
export function extractRoutes(routesModel: Model): RouteDef[] {
  const routes: RouteDef[] = [];

  for (const [pathKey, prop] of routesModel.properties) {
    const routeType = prop.type;

    // Verify this is a template instance of Route<T>
    if (routeType.kind !== "Model" || !routeType.templateMapper) {
      throw new Error(`Route "${pathKey}": expected Route<Component<...>>, got ${routeType.kind}`);
    }
    if (routeType.name !== "Route") {
      throw new Error(`Route "${pathKey}": expected Route template, got "${routeType.name}"`);
    }

    // Extract Component from Route<Component<P, S, E>>
    const componentType = routeType.templateMapper.args[0];
    if (componentType.kind !== "Model" || !componentType.templateMapper) {
      throw new Error(`Route "${pathKey}": Route's type arg must be Component<P, S, E>`);
    }
    if (componentType.name !== "Component") {
      throw new Error(`Route "${pathKey}": expected Component template, got "${componentType.name}"`);
    }

    const cArgs = componentType.templateMapper.args;
    if (cArgs.length !== 3) {
      throw new Error(`Route "${pathKey}": Component expects 3 type args, got ${cArgs.length}`);
    }

    const props = cArgs[0] as Model;
    const state = cArgs[1] as Model;
    const events = cArgs[2] as Union;

    if (state.kind !== "Model") {
      throw new Error(`Route "${pathKey}": TState must be a Model, got ${state.kind}`);
    }
    if (events.kind !== "Union") {
      throw new Error(`Route "${pathKey}": TEvents must be a Union, got ${events.kind}`);
    }

    routes.push({
      path: pathKey,
      fileName: pathToFileName(pathKey),
      componentName: stateNameToComponentName(state.name),
      props,
      state,
      events,
    });
  }

  return routes;
}
