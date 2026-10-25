import { Output, render, refkey } from "@alloy-js/core"
import { CrateDirectory } from "../components/3_files/1_CrateDirectory.js"
import { ModDirectory } from "../components/3_files/2_ModDirectory.js"
import { SourceFile } from "../components/3_files/0_SourceFile.js"
import { FunctionDeclaration } from "../components/1_declarations/4_FunctionDeclaration.js"
import { AxumEndpoint, type AxumEndpointParam } from "../components/4_codegen/4_AxumEndpoint.js"
import { Zone, ZoneProvider } from "../components/4_codegen/0_AppendZone.js"
import { CliAutoFile, HttpAutoFile, OpsAutoFile, OpsStubFile, type OpsKeys } from "../components/4_codegen/7_OpsTransports.js"
import { VisibilityContext } from "../scopes/06_contexts.js"
import { createRustNamePolicy } from "../00_name-policy.js"
import { emitTypeDef } from "./02_emit-model.js"
import { domainExtras, planOps, type ModelExtras } from "./04_ops-plan.js"
import { DaemonFiles } from "./07_daemon-files.js"
import type { RefkeyRegistry } from "./01_type-map.js"
import type { ServiceDef, TypeDef } from "./00_types.js"

export type Transport = "cli" | "http"

export interface OpsEmitOptions {
  service: ServiceDef
  bin?: string
  // Which transports to project the ops onto. Default both. Without "cli" no clap
  // derive or attr is emitted and cli_auto.rs is not written.
  transports?: Transport[]
  cli?: boolean
  http?: boolean
  // Name of a generated trait with one method per op. The axum handlers then call
  // it through `State<Arc<S>>` and `router(state: Arc<S>)` instead of `<prefix>::ops::<op>`.
  handlerTrait?: string
}

export interface CrateEmitOptions {
  // Rust path the emitted root module is mounted at: "crate" (default) or "crate::_9_wire".
  modulePrefix?: string
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
  const transports = ops?.transports ?? ["cli", "http"]
  const cli = !!ops && ops.cli !== false && transports.includes("cli")
  const http = !!ops && ops.http !== false && transports.includes("http")
  const modulePrefix = options.modulePrefix ?? "crate"
  const extras: Map<string, ModelExtras> = ops && cli ? domainExtras(types, ops.service) : new Map()
  const emitted = types.map(t => emitTypeDef(t, registry, registry.get(t.name), extras.get(t.name), !!ops?.service.daemon))

  const keys: OpsKeys = { opError: refkey(), opResult: refkey(), root: refkey(), cmd: refkey(), handlerTrait: refkey() }
  const plans = ops ? planOps(ops.service, registry, refkey) : []
  const implPath = `${modulePrefix}::ops`
  const daemon = !!ops?.service.daemon
  const handlerTrait = !daemon ? ops?.handlerTrait : undefined
  const errors = daemon ? [] : (ops?.service.errors ?? []).map(e => ({ ...e, key: registry.get(e.name) ?? e.name }))

  const endpoints = options.axumEndpoints ?? []
  const routingUses = [...new Set(endpoints.map(endpoint => `axum::routing::${endpoint.method}`))]

  const tree = (
    <Output namePolicy={createRustNamePolicy()}>
      <VisibilityContext.Provider value="pub">
        <ZoneProvider>
          <CrateDirectory modulePath={modulePrefix}>
            <ModDirectory name={modelsModule}>{emitted.map(e => e.jsx)}</ModDirectory>
            {ops && <OpsAutoFile plans={plans} keys={keys} daemon={daemon} cli={cli} handlerTrait={handlerTrait} errors={errors} />}
            {ops && (cli || !handlerTrait) && <OpsStubFile plans={plans} keys={keys} daemon={daemon} />}
            {ops && cli && (
              <CliAutoFile plans={plans} keys={keys} bin={ops.bin ?? ops.service.name.toLowerCase()} service={ops.service} registry={registry} implPath={implPath} errors={errors} />
            )}
            {ops && daemon && <DaemonFiles service={ops.service} plans={plans} types={types} bin={ops.bin ?? ops.service.name.toLowerCase()} />}
            {ops && !daemon && http && <HttpAutoFile plans={plans} keys={keys} registry={registry} implPath={implPath} handlerTrait={handlerTrait} errors={errors} />}
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
