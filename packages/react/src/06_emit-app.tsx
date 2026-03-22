// Orchestrates emission of a React app from TypeSpec component/route definitions.

import { Output, render } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { TspContext } from "@typespec/emitter-framework";
import { emitReactComponent } from "./04_emit-component.js";
import { emitRouteFile } from "./05_emit-route.js";
import type { ReactAppOptions } from "./00_types.js";

export function emitReactApp(options: ReactAppOptions) {
  const packageName = options.packageName ?? "my-app";

  const componentFiles = (options.components ?? []).map(c => emitReactComponent(c));
  const routeFiles = (options.routes ?? []).map(r => emitRouteFile(r));

  const tree = (
    <Output>
      <TspContext.Provider value={{ program: options.program }}>
        <ts.PackageDirectory name={packageName} version="0.1.0">
          {componentFiles.map(e => e.jsx)}
          {routeFiles.map(e => e.jsx)}
        </ts.PackageDirectory>
      </TspContext.Provider>
    </Output>
  );

  return render(tree);
}
