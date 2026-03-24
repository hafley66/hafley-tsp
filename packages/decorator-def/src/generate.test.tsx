import { describe, expect, it } from "vitest";
import { readLibrarySpec, type LibrarySpec } from "./reader.js";
import { generateTsp, generateTs, generateStateConfig } from "./generate.js";
import { $decoratorDef } from "./decorators.js";
import { DecoratorDefStateKeys } from "./lib.js";
import type { DecoratorContext, Model, Namespace, Program } from "@typespec/compiler";

// -- Mocks --

function mockProgram(): Program {
  const maps = new Map<symbol, Map<any, any>>();
  return {
    stateMap(key: symbol) {
      if (!maps.has(key)) maps.set(key, new Map());
      return maps.get(key)!;
    },
    getGlobalNamespaceType: undefined as any,
  } as any;
}

function mockCtx(program: Program): DecoratorContext {
  return { program, decoratorTarget: {} as any } as any;
}

function mockScalar(name: string): any {
  return { kind: "Scalar", name };
}

function mockProp(name: string, type: any, optional = false): any {
  return { kind: "ModelProperty", name, type, optional };
}

function mockModel(name: string, props: any[]): Model {
  return {
    kind: "Model",
    name,
    properties: new Map(props.map(p => [p.name, p])),
  } as any;
}

function mockNamespace(name: string, models: Model[], namespaces: any[] = []): Namespace {
  return {
    kind: "Namespace",
    name,
    models: new Map(models.map(m => [m.name, m])),
    enums: new Map(),
    namespaces: new Map(namespaces.map(ns => [ns.name, ns])),
  } as any;
}

// -- Tests --

describe("decorator-def pipeline", () => {
  function buildSpec(): { program: Program; spec: LibrarySpec } {
    const program = mockProgram();
    const ctx = mockCtx(program);

    // Target enum ordinals: 0=Namespace, 1=Interface, 2=Operation, 3=Model, 4=ModelProperty
    const T = { Namespace: 0, Interface: 1, Operation: 2, Model: 3, ModelProperty: 4 };

    // Define decorators using @decoratorDef
    const channel = mockModel("channel", [
      mockProp("address", mockScalar("string")),
    ]);
    $decoratorDef(ctx, channel, 1, [T.Namespace, T.Interface]);

    const payload = mockModel("payload", []);
    $decoratorDef(ctx, payload, 0, [T.ModelProperty]);

    const send = mockModel("send", []);
    $decoratorDef(ctx, send, 4, [T.Operation], {
      exclusiveKey: "direction",
      exclusiveValue: "send",
    });

    const receive = mockModel("receive", []);
    $decoratorDef(ctx, receive, 4, [T.Operation], {
      exclusiveKey: "direction",
      exclusiveValue: "receive",
    });

    const server = mockModel("server", [
      mockProp("url", mockScalar("string")),
      mockProp("protocol", mockScalar("string")),
    ]);
    $decoratorDef(ctx, server, 3, [T.Namespace], { doc: "Declare a server." });

    const reply = mockModel("reply", [
      mockProp("channel", mockScalar("string"), true),
      mockProp("addressExpr", mockScalar("string"), true),
    ]);
    $decoratorDef(ctx, reply, 2, [T.Operation]);

    // Wire up global namespace
    const myNs = mockNamespace("MyLib", [channel, payload, send, receive, server, reply]);
    const globalNs = mockNamespace("", [], [
      mockNamespace("TypeSpec", []),
      myNs,
    ]);
    (program as any).getGlobalNamespaceType = () => globalNs;

    const spec = readLibrarySpec(program, "MyLib");
    return { program, spec };
  }

  it("reads @decoratorDef models into LibrarySpec", () => {
    const { spec } = buildSpec();
    expect(spec.decorators.map(d => `${d.name}:${d.shape}`)).toMatchInlineSnapshot(`
      [
        "channel:value",
        "payload:flag",
        "send:exclusive",
        "receive:exclusive",
        "server:list",
        "reply:object",
      ]
    `);
  });

  it("generates .tsp declarations from spec", () => {
    const { spec } = buildSpec();
    expect(generateTsp(spec)).toMatchInlineSnapshot(`
      "using TypeSpec.Reflection;

      namespace MyLib;
      extern dec channel(target: Namespace | Interface, address: valueof string);

      extern dec payload(target: ModelProperty);

      extern dec send(target: Operation);

      extern dec receive(target: Operation);

      /**
       * Declare a server.
       */
      extern dec server(target: Namespace, url: valueof string, protocol: valueof string);

      extern dec reply(target: Operation, channel?: valueof string, addressExpr?: valueof string);
      "
    `);
  });

  it("generates .ts factory-backed code from spec", () => {
    const { spec } = buildSpec();
    const ts = generateTs(spec, "MyLibStateKeys");
    expect(ts).toMatchInlineSnapshot(`
      "import type { Program, Type } from "@typespec/compiler";
      import { MyLibStateKeys, reportDiagnostic } from "./lib.js";
      import { flagDec, valueDec, objectDec, listDec, exclusiveDec } from "./decorator-factory.js";

      export const namespace = "MyLib";
      export interface ServerDef {
        url: string;
        protocol: string;
      }
      export interface ReplyDef {
        channel?: string;
        addressExpr?: string;
      }

      function onDuplicateDirection(program: any, target: any, name: string) {
        reportDiagnostic(program, { code: "duplicate-direction", format: { name }, target });
      }

      const _channel = valueDec<string>(MyLibStateKeys.channel);
      const _payload = flagDec(MyLibStateKeys.payload);
      const _send = exclusiveDec<string>(MyLibStateKeys.direction, "send", onDuplicateDirection);
      const _receive = exclusiveDec<string>(MyLibStateKeys.direction, "receive", onDuplicateDirection);
      const _server = listDec<ServerDef>(MyLibStateKeys.server,
        (_target, url, protocol) => ({ url, protocol }),
      );
      const _reply = objectDec<ReplyDef>(MyLibStateKeys.reply,
        (_target, channel, addressExpr) => ({ channel, addressExpr }),
      );

      export const $channel = _channel.$decorator;
      export const $payload = _payload.$decorator;
      export const $send = _send.$decorator;
      export const $receive = _receive.$decorator;
      export const $server = _server.$decorator;
      export const $reply = _reply.$decorator;

      export const getChannel = _channel.get;
      export const hasChannel = _channel.has;
      export const isPayload = _payload.has;
      export const getServer = _server.get;
      export const hasServer = _server.has;
      export const getReply = _reply.get;
      export const hasReply = _reply.has;
      export type Direction = "send" | "receive";
      export const getDirection = _send.get as (program: Program, target: Type) => Direction | undefined;

      export const $decorators = {
        "MyLib": {
          channel: $channel,
          payload: $payload,
          send: $send,
          receive: $receive,
          server: $server,
          reply: $reply,
        },
      };
      "
    `);
  });

  it("generates state config for createTypeSpecLibrary", () => {
    const { spec } = buildSpec();
    expect(generateStateConfig(spec)).toMatchInlineSnapshot(`
      {
        "channel": {
          "description": "State for @channel decorator",
        },
        "direction": {
          "description": "State for @receive decorator",
        },
        "payload": {
          "description": "State for @payload decorator",
        },
        "reply": {
          "description": "State for @reply decorator",
        },
        "server": {
          "description": "State for @server decorator",
        },
      }
    `);
  });
});
