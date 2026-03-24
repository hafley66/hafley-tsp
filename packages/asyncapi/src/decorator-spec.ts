/**
 * Single source of truth for AsyncAPI decorator definitions.
 *
 * Run `pnpm generate` to produce:
 *   - lib/decorators.tsp  (extern dec declarations + options models)
 *   - src/decorators.ts   (factory-backed implementations + accessors)
 */

import type { LibrarySpec } from "./decorator-codegen.js";

export const asyncapiSpec: LibrarySpec = {
  namespace: "AsyncAPI",
  tsImports: [
    `import type { AmqpChannelBindingsDef, AmqpOperationBindingsDef } from "./0_types.js";`,
  ],
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
        { name: "pathname", type: "string", doc: "Path on the server host" },
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
        { name: "addressExpr", type: "string", doc: "Runtime expression for the reply address." },
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
        { name: "bindings", type: "AmqpChannelBindingsDef" },
      ],
    },
    {
      name: "amqpOperationBinding",
      targets: "Operation",
      shape: "value",
      doc: "Apply AMQP-specific operation bindings.",
      params: [
        { name: "bindings", type: "AmqpOperationBindingsDef" },
      ],
    },
  ],
};
