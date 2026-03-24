import { describe, expect, it } from "vitest";
import { generateTsp, generateTs, generateStateKeys, type LibrarySpec } from "./decorator-codegen.js";

const asyncapiSpec: LibrarySpec = {
  namespace: "AsyncAPI",
  decorators: [
    {
      name: "server",
      targets: "Namespace",
      shape: "list",
      doc: "Declare a server this application connects to.",
      params: [
        { name: "url", type: "string", doc: "The server host, may contain {variables}." },
        { name: "protocol", type: "string", doc: 'The wire protocol: "amqp", "mqtt", "kafka", etc.' },
      ],
      options: [
        { name: "protocolVersion", type: "string", doc: 'Protocol version (e.g. "0-9-1" for AMQP)' },
        { name: "pathname", type: "string", doc: 'Path on the server host' },
      ],
      example: '@server("rabbitmq.example.org", "amqp")\nnamespace MyService;',
    },
    {
      name: "channel",
      targets: ["Namespace", "Interface"],
      shape: "value",
      doc: "Declare a channel (addressable communication path).",
      params: [
        { name: "address", type: "string", doc: "The channel address template." },
      ],
      example: '@channel("/users/{userId}/events")\nnamespace UserEvents { }',
    },
    {
      name: "send",
      targets: "Operation",
      shape: "exclusive",
      exclusiveKey: "direction",
      exclusiveValue: "send",
      doc: "This operation sends messages to its channel.",
    },
    {
      name: "receive",
      targets: "Operation",
      shape: "exclusive",
      exclusiveKey: "direction",
      exclusiveValue: "receive",
      doc: "This operation receives messages from its channel.",
    },
    {
      name: "reply",
      targets: "Operation",
      shape: "object",
      doc: "Declare that this operation uses request-reply pattern.",
      options: [
        { name: "channel", type: "string", doc: "Reference to the reply channel." },
        { name: "addressExpr", type: "string", doc: 'Runtime expression for the reply address.' },
      ],
    },
    {
      name: "correlationId",
      targets: "Operation",
      shape: "value",
      doc: "Specify a correlation ID for message tracing.",
      params: [
        { name: "location", type: "string", doc: 'Runtime expression, e.g. "$message.header#/correlationId"' },
      ],
    },
    {
      name: "payload",
      targets: "ModelProperty",
      shape: "flag",
      doc: "Mark a parameter as the message payload.",
    },
    {
      name: "messageHeader",
      targets: "ModelProperty",
      shape: "value",
      doc: "Mark a parameter as coming from message-level metadata.",
      params: [
        { name: "name", type: "string", optional: true, doc: "Optional metadata field name." },
      ],
    },
    {
      name: "contentType",
      targets: ["Namespace", "Interface", "Operation"],
      shape: "value",
      doc: "Specify the content type for messages.",
      params: [
        { name: "mediaType", type: "string", doc: 'The media type, e.g. "application/json"' },
      ],
    },
    {
      name: "amqpBinding",
      targets: ["Namespace", "Interface"],
      shape: "value",
      doc: "Apply AMQP-specific channel bindings.",
      params: [
        { name: "bindings", type: "AmqpChannelBindings" },
      ],
    },
    {
      name: "amqpOperationBinding",
      targets: "Operation",
      shape: "value",
      doc: "Apply AMQP-specific operation bindings.",
      params: [
        { name: "bindings", type: "AmqpOperationBindings" },
      ],
    },
  ],
};

describe("decorator-codegen", () => {
  it("generates .tsp declarations", () => {
    const tsp = generateTsp(asyncapiSpec);
    expect(tsp).toMatchInlineSnapshot(`
      "using TypeSpec.Reflection;

      namespace AsyncAPI;

      model ServerOptions {
        /** Protocol version (e.g. "0-9-1" for AMQP) */
        protocolVersion?: string;

        /** Path on the server host */
        pathname?: string;
      }

      /**
       * Declare a server this application connects to.
       *
       * @param url The server host, may contain {variables}.
       * @param protocol The wire protocol: "amqp", "mqtt", "kafka", etc.
       *
       * @example
       * \`\`\`typespec
       * @server("rabbitmq.example.org", "amqp")
       * namespace MyService;
       * \`\`\`
       */
      extern dec server(target: Namespace, url: valueof string, protocol: valueof string, options?: valueof ServerOptions);

      /**
       * Declare a channel (addressable communication path).
       *
       * @param address The channel address template.
       *
       * @example
       * \`\`\`typespec
       * @channel("/users/{userId}/events")
       * namespace UserEvents { }
       * \`\`\`
       */
      extern dec channel(target: Namespace | Interface, address: valueof string);

      /**
       * This operation sends messages to its channel.
       */
      extern dec send(target: Operation);

      /**
       * This operation receives messages from its channel.
       */
      extern dec receive(target: Operation);

      model ReplyOptions {
        /** Reference to the reply channel. */
        channel?: string;

        /** Runtime expression for the reply address. */
        addressExpr?: string;
      }

      /**
       * Declare that this operation uses request-reply pattern.
       */
      extern dec reply(target: Operation, options?: valueof ReplyOptions);

      /**
       * Specify a correlation ID for message tracing.
       *
       * @param location Runtime expression, e.g. "$message.header#/correlationId"
       */
      extern dec correlationId(target: Operation, location: valueof string);

      /**
       * Mark a parameter as the message payload.
       */
      extern dec payload(target: ModelProperty);

      /**
       * Mark a parameter as coming from message-level metadata.
       *
       * @param name Optional metadata field name.
       */
      extern dec messageHeader(target: ModelProperty, name?: valueof string);

      /**
       * Specify the content type for messages.
       *
       * @param mediaType The media type, e.g. "application/json"
       */
      extern dec contentType(target: Namespace | Interface | Operation, mediaType: valueof string);

      /**
       * Apply AMQP-specific channel bindings.
       *
       */
      extern dec amqpBinding(target: Namespace | Interface, bindings: valueof AmqpChannelBindings);

      /**
       * Apply AMQP-specific operation bindings.
       *
       */
      extern dec amqpOperationBinding(target: Operation, bindings: valueof AmqpOperationBindings);
      "
    `);
  });

  it("generates .ts factory-backed decorators", () => {
    const ts = generateTs(asyncapiSpec, "AsyncApiStateKeys");
    expect(ts).toMatchInlineSnapshot(`
      "import type { Program, Type } from "@typespec/compiler";
      import { AsyncApiStateKeys, reportDiagnostic } from "./lib.js";
      import { flagDec, valueDec, objectDec, listDec, exclusiveDec } from "./decorator-factory.js";

      export const namespace = "AsyncAPI";

      // ---- State types ----
      export interface ServerDef {
        url: string;
        protocol: string;
        protocolVersion?: string;
        pathname?: string;
      }

      export interface ReplyDef {
        channel?: string;
        addressExpr?: string;
      }

      // ---- Conflict handlers ----
      function onDuplicateDirection(program: any, target: any, name: string) {
        reportDiagnostic(program, { code: "duplicate-direction", format: { name }, target });
      }

      // ---- Decorator instances ----
      const _server = listDec<ServerDef>(AsyncApiStateKeys.server,
        (_target, url, protocol, protocolVersion, pathname) => ({ url, protocol, protocolVersion, pathname }),
      );
      const _channel = valueDec<string>(AsyncApiStateKeys.channel);
      const _send = exclusiveDec<string>(AsyncApiStateKeys.direction, "send", onDuplicateDirection);
      const _receive = exclusiveDec<string>(AsyncApiStateKeys.direction, "receive", onDuplicateDirection);
      const _reply = objectDec<ReplyDef>(AsyncApiStateKeys.reply,
        (_target, channel, addressExpr) => ({ channel: channel, addressExpr: addressExpr }),
      );
      const _correlationId = valueDec<string>(AsyncApiStateKeys.correlationId);
      const _payload = flagDec(AsyncApiStateKeys.payload);
      const _messageHeader = valueDec<string>(AsyncApiStateKeys.messageHeader);
      const _contentType = valueDec<string>(AsyncApiStateKeys.contentType);
      const _amqpBinding = valueDec<AmqpChannelBindings>(AsyncApiStateKeys.amqpBinding);
      const _amqpOperationBinding = valueDec<AmqpOperationBindings>(AsyncApiStateKeys.amqpOperationBinding);

      // ---- $decorator exports ----
      export const $server = _server.$decorator;
      export const $channel = _channel.$decorator;
      export const $send = _send.$decorator;
      export const $receive = _receive.$decorator;
      export const $reply = _reply.$decorator;
      export const $correlationId = _correlationId.$decorator;
      export const $payload = _payload.$decorator;
      export const $messageHeader = _messageHeader.$decorator;
      export const $contentType = _contentType.$decorator;
      export const $amqpBinding = _amqpBinding.$decorator;
      export const $amqpOperationBinding = _amqpOperationBinding.$decorator;

      // ---- Accessor exports ----
      export const getServer = _server.get;
      export const hasServer = _server.has;
      export const getChannel = _channel.get;
      export const hasChannel = _channel.has;
      export const getReply = _reply.get;
      export const hasReply = _reply.has;
      export const getCorrelationId = _correlationId.get;
      export const hasCorrelationId = _correlationId.has;
      export const isPayload = _payload.has;
      export const getMessageHeader = _messageHeader.get;
      export const hasMessageHeader = _messageHeader.has;
      export const getContentType = _contentType.get;
      export const hasContentType = _contentType.has;
      export const getAmqpBinding = _amqpBinding.get;
      export const hasAmqpBinding = _amqpBinding.has;
      export const getAmqpOperationBinding = _amqpOperationBinding.get;
      export const hasAmqpOperationBinding = _amqpOperationBinding.has;

      // ---- Exclusive group types + getters ----
      export type Direction = "send" | "receive";
      export const getDirection = _send.get as (program: Program, target: Type) => Direction | undefined;

      // ---- $decorators map (for tsp-index.ts) ----
      export const $decorators = {
        "AsyncAPI": {
          server: $server,
          channel: $channel,
          send: $send,
          receive: $receive,
          reply: $reply,
          correlationId: $correlationId,
          payload: $payload,
          messageHeader: $messageHeader,
          contentType: $contentType,
          amqpBinding: $amqpBinding,
          amqpOperationBinding: $amqpOperationBinding,
        },
      };
      "
    `);
  });

  it("generates state keys for lib.ts", () => {
    const keys = generateStateKeys(asyncapiSpec);
    expect(keys).toMatchInlineSnapshot(`
      {
        "amqpBinding": {
          "description": "State for @amqpBinding decorator",
        },
        "amqpOperationBinding": {
          "description": "State for @amqpOperationBinding decorator",
        },
        "channel": {
          "description": "State for @channel decorator",
        },
        "contentType": {
          "description": "State for @contentType decorator",
        },
        "correlationId": {
          "description": "State for @correlationId decorator",
        },
        "direction": {
          "description": "State for @receive decorator",
        },
        "messageHeader": {
          "description": "State for @messageHeader decorator",
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
