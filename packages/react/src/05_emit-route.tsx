// Emits a single TanStack Router route file with auto/manual zones.
// Auto zone: state interface, event types, defaults, reducer (re-emittable)
// Manual zone: route component + createFileRoute wiring (first run only, preserved on re-emit)

import type { RouteDef } from "./00_types.js";
import { TsReplaceFile, AutoZone, ManualZone } from "./03_replace-region.js";
import { AutoStateBlock, toCamelCase, hasDefault } from "./02_emit-shared.js";

export function emitRouteFile(route: RouteDef) {
  const stateName = route.state.name;
  const defaultsName = `${toCamelCase(stateName)}Defaults`;
  const reducerName = `${toCamelCase(stateName)}Reducer`;

  const allProps = Array.from(route.state.properties.values());
  const hasAllDefaults = allProps.every(p => p.optional || hasDefault(p));

  const paramNames = (route.path.match(/\$\w+/g) || []).map(p => p.slice(1));
  const filePath = `routes/${route.fileName}.tsx`;

  const jsx = (
    <TsReplaceFile path={filePath}>
      <AutoZone id="auto">
        {`import { createFileRoute } from "@tanstack/react-router";\n`}
        {`import { useReducer } from "react";\n\n`}
        <AutoStateBlock state={route.state} events={route.events} />
      </AutoZone>
      <ManualZone>
        {`function ${route.componentName}Page() {\n`}
        {hasAllDefaults
          ? `  const [state, dispatch] = useReducer(${reducerName}, ${defaultsName});\n`
          : `  const [state, dispatch] = useReducer(${reducerName}, {} as ${stateName});\n`
        }
        {paramNames.length > 0
          ? `  const { ${paramNames.join(", ")} } = Route.useParams();\n`
          : ""
        }
        {`\n  // TODO: render\n  return <div>TODO</div>;\n}\n\n`}
        {`export const Route = createFileRoute("${route.path}")({\n`}
        {`  component: ${route.componentName}Page,\n`}
        {`});\n`}
      </ManualZone>
    </TsReplaceFile>
  );

  return { path: route.path, fileName: route.fileName, jsx };
}
