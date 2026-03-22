// React component emitter types.
// These describe what we need from a TypeSpec program to emit a React component.
// They reference TypeSpec compiler types directly.

import type { Model, Union, ModelProperty, Program } from "@typespec/compiler";

// A component to emit: state model + event union + display name
export interface ComponentDef {
  name: string;
  state: Model;        // TypeSpec Model with properties and defaults
  events: Union;       // TypeSpec Union of event models
}

// A route extracted from AppRoutes model: path + component definition
export interface RouteDef {
  path: string;            // literal property key from AppRoutes, e.g. "/users/$userId"
  fileName: string;        // TanStack Router file name, e.g. "users.$userId"
  componentName: string;   // derived from state model name or path
  props: Model;            // TProps from Component<TProps, TState, TEvents>
  state: Model;            // TState
  events: Union;           // TEvents
}

export interface ReactAppOptions {
  packageName?: string;
  components?: ComponentDef[];
  routes?: RouteDef[];
  program: Program;
}
