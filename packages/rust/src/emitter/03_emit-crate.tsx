import { Output, render, refkey } from "@alloy-js/core"
import { CrateDirectory } from "../components/3_files/1_CrateDirectory.js"
import { ModDirectory } from "../components/3_files/2_ModDirectory.js"
import { SourceFile } from "../components/3_files/0_SourceFile.js"
import { FunctionDeclaration } from "../components/1_declarations/4_FunctionDeclaration.js"
import { AxumEndpoint, type AxumEndpointParam } from "../components/4_codegen/4_AxumEndpoint.js"
import { Zone, ZoneProvider } from "../components/4_codegen/0_AppendZone.js"
import { CliAutoFile, HttpAutoFile, OpsAutoFile, OpsStubFile, type OpsKeys } from "../components/4_codegen/7_OpsTransports.js"
import { VisibilityContext } from "../scopes/06_contexts.js"
import { emitTypeDef } from "./02_emit-model.js"
import { domainExtras, planOps, type ModelExtras } from "./04_ops-plan.js"
import { DaemonFiles } from "./07_daemon-files.js"
import type { RefkeyRegistry } from "./01_type-map.js"
import type { ServiceDef, TypeDef } from "./00_types.js"

export interface OpsEmitOptions {
  service: ServiceDef
  bin?: string
  cli?: boolean
  http?: boolean
}

export interface CrateEmitOptions {
  modelsModule?: string
  ops?: OpsEmitOptions
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

  const ops = options.ops
  const extras: Map<string, ModelExtras> = ops ? domainExtras(types, ops.service) : new Map()
  const emitted = types.map(t => emitTypeDef(t, registry, registry.get(t.name), extras.get(t.name), !!ops?.service.daemon))

  const keys: OpsKeys = { opError: refkey(), opResult: refkey(), root: refkey(), cmd: refkey() }
  const plans = ops ? planOps(ops.service, registry, refkey) : []
  const implPath = "crate::ops"

  const endpoints = options.axumEndpoints ?? []
  const routingUses = [...new Set(endpoints.map(endpoint => `axum::routing::${endpoint.method}`))]

  const tree = (
    <Output>
      <VisibilityContext.Provider value="pub">
        <ZoneProvider>
          <CrateDirectory>
            <ModDirectory name={modelsModule}>{emitted.map(e => e.jsx)}</ModDirectory>
            {ops && <OpsAutoFile plans={plans} keys={keys} daemon={!!ops.service.daemon} />}
            {ops && <OpsStubFile plans={plans} keys={keys} daemon={!!ops.service.daemon} />}
            {ops && ops.cli !== false && (
              <CliAutoFile plans={plans} keys={keys} bin={ops.bin ?? ops.service.name.toLowerCase()} service={ops.service} registry={registry} implPath={implPath} />
            )}
            {ops && ops.service.daemon && <DaemonFiles service={ops.service} plans={plans} types={types} bin={ops.bin ?? ops.service.name.toLowerCase()} />}
            {ops && !ops.service.daemon && ops.http !== false && <HttpAutoFile plans={plans} keys={keys} registry={registry} implPath={implPath} />}
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
