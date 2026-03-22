// Emits a single React component file with auto/manual zones.
// Auto zone: state interface, event types, defaults, reducer (re-emittable)
// Manual zone: component body scaffold (first run only, preserved on re-emit)

import type { ComponentDef } from "./00_types.js";
import { TsReplaceFile, AutoZone, ManualZone } from "./03_replace-region.js";
import { AutoStateBlock, toCamelCase, hasDefault } from "./02_emit-shared.js";

export function emitReactComponent(def: ComponentDef) {
  const stateName = def.state.name;
  const defaultsName = `${toCamelCase(stateName)}Defaults`;
  const reducerName = `${toCamelCase(stateName)}Reducer`;

  const allProps = Array.from(def.state.properties.values());
  const hasAllDefaults = allProps.every(p => p.optional || hasDefault(p));

  const fileName = `${def.name}.tsx`;

  const jsx = (
    <TsReplaceFile path={fileName}>
      <AutoZone id="auto">
        <AutoStateBlock state={def.state} events={def.events} />
      </AutoZone>
      <ManualZone>
        {`import { useReducer } from "react";\n\n`}
        {`export function ${def.name}() {\n`}
        {hasAllDefaults
          ? `  const [state, dispatch] = useReducer(${reducerName}, ${defaultsName});\n`
          : `  const [state, dispatch] = useReducer(${reducerName}, {} as ${stateName});\n`
        }
        {`\n  // TODO: render\n  return <div>TODO</div>;\n}\n`}
      </ManualZone>
    </TsReplaceFile>
  );

  return { name: def.name, jsx };
}
