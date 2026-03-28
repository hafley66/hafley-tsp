using TypeSpec.Reflection;

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
 * ```typespec
 * @server("rabbitmq.example.org", "amqp")
 * namespace MyService;
 * ```
 */
extern dec server(target: Namespace, url: valueof string, protocol: valueof string, options?: valueof ServerOptions);

/**
 * Declare a channel (addressable communication path).
 *
 * @param address The channel address template.
 *
 * @example
 * ```typespec
 * @channel("/users/{userId}/events")
 * namespace UserEvents { }
 * ```
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
