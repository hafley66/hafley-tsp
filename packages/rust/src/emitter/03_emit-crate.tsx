import { Output, render, refkey } from "@alloy-js/core"
import { CrateDirectory } from "../components/3_files/1_CrateDirectory.js"
import { ModDirectory } from "../components/3_files/2_ModDirectory.js"
import { SourceFile } from "../components/3_files/0_SourceFile.js"
import { FunctionDeclaration } from "../components/1_declarations/4_FunctionDeclaration.js"
import { AxumEndpoint, type AxumEndpointParam } from "../components/4_codegen/4_AxumEndpoint.js"
import { Zone, ZoneProvider } from "../components/4_codegen/0_AppendZone.js"
import { VisibilityContext } from "../scopes/06_contexts.js"
import { emitTypeDef } from "./02_emit-model.js"
import type { RefkeyRegistry } from "./01_type-map.js"
import type { TypeDef } from "./00_types.js"

export interface CrateEmitOptions {
  modelsModule?: string
  axumEndpoints?: AxumEndpointEmitOptions[]
}

export interface AxumEndpointEmitOptions {
  path: string
  method: "get" | "post" | "put" | "patch" | "delete"
  name: string
  responseModel: string
  responseList?: boolean
  params?: AxumEndpointParam[]
  existingFile?: string
}

export function emitCrate(types: TypeDef[], options: CrateEmitOptions = {}) {
  const modelsModule = options.modelsModule ?? "models"

  // Pre-allocate refkeys for all types so cross-references resolve
  const registry: RefkeyRegistry = new Map()
  for (const t of types) {
    registry.set(t.name, refkey())
  }

  const emitted = types.map(t => emitTypeDef(t, registry, registry.get(t.name)))
  const endpoints = options.axumEndpoints ?? []
  const routingUses = [...new Set(endpoints.map(endpoint => `axum::routing::${endpoint.method}`))]

  const tree = (
    <Output>
      <VisibilityContext.Provider value="pub">
        <ZoneProvider>
          <CrateDirectory>
            <ModDirectory name={modelsModule}>{emitted.map(e => e.jsx)}</ModDirectory>
            {endpoints.map(endpoint => {
              const responseModel = registry.get(endpoint.responseModel)
              if (!responseModel) throw new Error(`Unknown Axum response model: ${endpoint.responseModel}`)
              return <AxumEndpoint {...endpoint} routePath={endpoint.name} responseModel={responseModel} />
            })}
            <SourceFile path="lib.rs" externalUses={endpoints.length ? ["axum::Router", ...routingUses] : undefined}>
              {endpoints.length ? (
                <FunctionDeclaration name="router" returns="Router">
                  Router::new()
                  <Zone name="router" />
                </FunctionDeclaration>
              ) : undefined}
            </SourceFile>
          </CrateDirectory>
        </ZoneProvider>
      </VisibilityContext.Provider>
    </Output>
  )

  return render(tree)
}
