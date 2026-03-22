using TypeSpec.Reflection;

namespace AsyncAPI;

// ============================================================================
// Server
// ============================================================================
// Maps to: AsyncAPI Server Object
// Where: top-level namespace
//
// @server("rabbitmq.example.org", "amqp")
// @server("api.example.com", "http")
// namespace MyService { ... }

model ServerOptions {
  /** Protocol version (e.g. "0-9-1" for AMQP, "2.0" for HTTP) */
  protocolVersion?: string;

  /** Path on the server host (e.g. "/production" for AMQP vhost) */
  pathname?: string;
}

/**
 * Declare a server this application connects to.
 * Multiple @server decorators can be used for multiple servers.
 *
 * @param url The server host, may contain {variables}.
 * @param protocol The wire protocol: "amqp", "mqtt", "kafka", "nats", "http", "ws", etc.
 * @param options Optional server configuration.
 *
 * @example
 * ```typespec
 * @server("rabbitmq.example.org", "amqp")
 * namespace MyService;
 * ```
 *
 * @example Parameterized
 * ```typespec
 * @server("broker.{env}.example.com:5672", "amqp", #{ pathname: "/{vhost}" })
 * namespace MyService;
 * ```
 */
extern dec server(target: Namespace, url: valueof string, protocol: valueof string, options?: valueof ServerOptions);

// ============================================================================
// Channel
// ============================================================================
// Maps to: AsyncAPI Channel Object
// Where: namespace or interface
//
// The address uses the same {param} syntax as @typespec/http @route.
// The emitter translates delimiters per transport:
//   HTTP: /rooms/{roomId}      (slashes)
//   CLI:  rooms <roomId>       (spaces → subcommands)
//   AMQP: rooms.{roomId}      (dots → routing key)
//   Kafka: rooms.{roomId}     (dots → topic)

/**
 * Declare a channel (addressable communication path).
 *
 * @param address The channel address template. Uses {param} for parameters.
 *
 * @example
 * ```typespec
 * @channel("/users/{userId}/events")
 * namespace UserEvents {
 *   @receive op onEvent(@payload event: UserEvent): void;
 * }
 * ```
 */
extern dec channel(target: Namespace | Interface, address: valueof string);

// ============================================================================
// Operation direction
// ============================================================================
// Maps to: AsyncAPI Operation Object `action` field
//
// @send = this application publishes/sends to the channel
// @receive = this application consumes/receives from the channel
//
// HTTP ops are implicitly @receive (server handles requests).
// Broker ops MUST declare direction explicitly.

/**
 * This operation sends messages to its channel.
 *
 * @example
 * ```typespec
 * @send op publishOrder(@payload order: Order): void;
 * ```
 */
extern dec send(target: Operation);

/**
 * This operation receives messages from its channel.
 *
 * @example
 * ```typespec
 * @receive op onOrder(@payload order: Order): void;
 * ```
 */
extern dec receive(target: Operation);

// ============================================================================
// Reply
// ============================================================================
// Maps to: AsyncAPI Operation Reply Object
//
// For HTTP, reply is implicit (the response).
// For brokers, reply goes to a different channel, with address
// potentially extracted from a message header at runtime.

model ReplyOptions {
  /** Reference to the reply channel (by address or namespace). */
  channel?: string;

  /** Runtime expression for the reply address, e.g. "$message.header#/replyTo" */
  addressExpr?: string;
}

/**
 * Declare that this operation uses request-reply pattern.
 *
 * @param options Reply configuration.
 *
 * @example AMQP RPC
 * ```typespec
 * @receive
 * @reply(#{ addressExpr: "$message.header#/replyTo" })
 * op sum(@payload request: SumRequest): SumResult;
 * ```
 */
extern dec reply(target: Operation, options?: valueof ReplyOptions);

// ============================================================================
// Correlation ID
// ============================================================================
// Maps to: AsyncAPI Correlation ID Object
//
// Runtime expression pointing into message header or payload.
// Used to match request-reply pairs across channels.

/**
 * Specify a correlation ID for message tracing and request-reply matching.
 *
 * @param location Runtime expression, e.g. "$message.header#/correlationId"
 *
 * @example
 * ```typespec
 * @correlationId("$message.header#/correlationId")
 * op sum(@payload request: SumRequest): SumResult;
 * ```
 */
extern dec correlationId(target: Operation, location: valueof string);

// ============================================================================
// Message metadata
// ============================================================================
// Maps to: AsyncAPI Message Object fields

/**
 * Mark a parameter as the message payload.
 * Equivalent to @body for HTTP, but protocol-agnostic.
 *
 * @example
 * ```typespec
 * @receive op onOrder(@payload order: Order): void;
 * ```
 */
extern dec payload(target: ModelProperty);

/**
 * Mark a parameter as coming from message-level metadata
 * (HTTP headers, AMQP properties, Kafka headers).
 *
 * @param name Optional metadata field name.
 *
 * @example
 * ```typespec
 * op process(@messageHeader("x-request-id") requestId: string, @payload data: Payload): void;
 * ```
 */
extern dec messageHeader(target: ModelProperty, name?: valueof string);

/**
 * Specify the content type for messages on this channel or operation.
 *
 * @param mediaType The media type, e.g. "application/json", "application/avro"
 *
 * @example
 * ```typespec
 * @contentType("application/json")
 * @channel("/events")
 * namespace Events { ... }
 * ```
 */
extern dec contentType(target: Namespace | Interface | Operation, mediaType: valueof string);

// ============================================================================
// Protocol bindings
// ============================================================================
// Maps to: AsyncAPI Bindings at server/channel/operation/message levels.
//
// These are open-ended key-value maps. Each protocol defines its own shape.
// The emitter passes them through; the TypeSpec library doesn't validate
// protocol-specific fields.

model AmqpChannelBindings {
  /** "queue" or "routingKey" */
  is?: string;

  /** Exchange configuration (when is = "routingKey") */
  exchange?: {
    name?: string;
    /** "topic", "direct", "fanout", "default", "headers" */
    type?: string;
    durable?: boolean;
    autoDelete?: boolean;
    vhost?: string;
  };

  /** Queue configuration (when is = "queue") */
  queue?: {
    name?: string;
    durable?: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
    vhost?: string;
  };
}

model AmqpOperationBindings {
  expiration?: int32;
  userId?: string;
  cc?: string[];
  priority?: int32;
  deliveryMode?: int32;
  mandatory?: boolean;
  bcc?: string[];
  timestamp?: boolean;
  ack?: boolean;
}

/**
 * Apply AMQP-specific channel bindings.
 *
 * @example
 * ```typespec
 * @channel("rpc_queue")
 * @amqpBinding(#{ is: "queue", queue: #{ durable: false, exclusive: true } })
 * namespace RpcService { ... }
 * ```
 */
extern dec amqpBinding(target: Namespace | Interface, bindings: valueof AmqpChannelBindings);

/**
 * Apply AMQP-specific operation bindings.
 *
 * @example
 * ```typespec
 * @receive
 * @amqpOperationBinding(#{ ack: true, deliveryMode: 2 })
 * op onOrder(@payload order: Order): void;
 * ```
 */
extern dec amqpOperationBinding(target: Operation, bindings: valueof AmqpOperationBindings);
