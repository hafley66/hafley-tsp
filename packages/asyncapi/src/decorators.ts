import {
  type DecoratorContext,
  type ModelProperty,
  type Namespace,
  type Interface,
  type Operation,
  type Type,
  type Program,
} from "@typespec/compiler";
import { AsyncApiStateKeys, reportDiagnostic } from "./lib.js";

export const namespace = "AsyncAPI";

// ---- Types stored in state ----

export interface ServerDef {
  url: string;
  protocol: string;
  protocolVersion?: string;
  pathname?: string;
}

export type Direction = "send" | "receive";

export interface ReplyDef {
  channel?: string;
  addressExpr?: string;
}

export interface MessageHeaderDef {
  name: string;
}

export interface AmqpChannelBindingsDef {
  is?: string;
  exchange?: {
    name?: string;
    type?: string;
    durable?: boolean;
    autoDelete?: boolean;
    vhost?: string;
  };
  queue?: {
    name?: string;
    durable?: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
    vhost?: string;
  };
}

export interface AmqpOperationBindingsDef {
  expiration?: number;
  userId?: string;
  cc?: string[];
  priority?: number;
  deliveryMode?: number;
  mandatory?: boolean;
  bcc?: string[];
  timestamp?: boolean;
  ack?: boolean;
}

// ============================================================================
// @server
// ============================================================================

export function $server(
  context: DecoratorContext,
  target: Namespace,
  url: string,
  protocol: string,
  options?: { protocolVersion?: string; pathname?: string },
) {
  let servers: ServerDef[] = context.program.stateMap(AsyncApiStateKeys.servers).get(target);
  if (!servers) {
    servers = [];
    context.program.stateMap(AsyncApiStateKeys.servers).set(target, servers);
  }
  servers.push({
    url,
    protocol,
    protocolVersion: options?.protocolVersion,
    pathname: options?.pathname,
  });
}

export function getServers(program: Program, target: Type): ServerDef[] | undefined {
  return program.stateMap(AsyncApiStateKeys.servers).get(target);
}

// ============================================================================
// @channel
// ============================================================================

export function $channel(
  context: DecoratorContext,
  target: Namespace | Interface,
  address: string,
) {
  context.program.stateMap(AsyncApiStateKeys.channel).set(target, address);
}

export function getChannelAddress(program: Program, target: Type): string | undefined {
  return program.stateMap(AsyncApiStateKeys.channel).get(target);
}

export function isChannel(program: Program, target: Type): boolean {
  return program.stateMap(AsyncApiStateKeys.channel).has(target);
}

// ============================================================================
// @send / @receive
// ============================================================================

export function $send(context: DecoratorContext, target: Operation) {
  const existing = context.program.stateMap(AsyncApiStateKeys.direction).get(target);
  if (existing) {
    reportDiagnostic(context.program, {
      code: "duplicate-direction",
      format: { name: target.name },
      target: context.decoratorTarget,
    });
    return;
  }
  context.program.stateMap(AsyncApiStateKeys.direction).set(target, "send" as Direction);
}

export function $receive(context: DecoratorContext, target: Operation) {
  const existing = context.program.stateMap(AsyncApiStateKeys.direction).get(target);
  if (existing) {
    reportDiagnostic(context.program, {
      code: "duplicate-direction",
      format: { name: target.name },
      target: context.decoratorTarget,
    });
    return;
  }
  context.program.stateMap(AsyncApiStateKeys.direction).set(target, "receive" as Direction);
}

export function getDirection(program: Program, target: Type): Direction | undefined {
  return program.stateMap(AsyncApiStateKeys.direction).get(target);
}

// ============================================================================
// @reply
// ============================================================================

export function $reply(
  context: DecoratorContext,
  target: Operation,
  options?: { channel?: string; addressExpr?: string },
) {
  const def: ReplyDef = {
    channel: options?.channel,
    addressExpr: options?.addressExpr,
  };
  context.program.stateMap(AsyncApiStateKeys.reply).set(target, def);
}

export function getReply(program: Program, target: Type): ReplyDef | undefined {
  return program.stateMap(AsyncApiStateKeys.reply).get(target);
}

// ============================================================================
// @correlationId
// ============================================================================

export function $correlationId(
  context: DecoratorContext,
  target: Operation,
  location: string,
) {
  context.program.stateMap(AsyncApiStateKeys.correlationId).set(target, location);
}

export function getCorrelationId(program: Program, target: Type): string | undefined {
  return program.stateMap(AsyncApiStateKeys.correlationId).get(target);
}

// ============================================================================
// @payload
// ============================================================================

export function $payload(context: DecoratorContext, target: ModelProperty) {
  context.program.stateMap(AsyncApiStateKeys.payload).set(target, true);
}

export function isPayload(program: Program, target: Type): boolean {
  return program.stateMap(AsyncApiStateKeys.payload).has(target);
}

// ============================================================================
// @messageHeader
// ============================================================================

export function $messageHeader(
  context: DecoratorContext,
  target: ModelProperty,
  name?: string,
) {
  const headerName = name ?? target.name;
  const def: MessageHeaderDef = { name: headerName };
  context.program.stateMap(AsyncApiStateKeys.messageHeader).set(target, def);
}

export function getMessageHeader(program: Program, target: Type): MessageHeaderDef | undefined {
  return program.stateMap(AsyncApiStateKeys.messageHeader).get(target);
}

export function isMessageHeader(program: Program, target: Type): boolean {
  return program.stateMap(AsyncApiStateKeys.messageHeader).has(target);
}

// ============================================================================
// @contentType
// ============================================================================

export function $contentType(
  context: DecoratorContext,
  target: Namespace | Interface | Operation,
  mediaType: string,
) {
  context.program.stateMap(AsyncApiStateKeys.contentType).set(target, mediaType);
}

export function getContentType(program: Program, target: Type): string | undefined {
  return program.stateMap(AsyncApiStateKeys.contentType).get(target);
}

// ============================================================================
// @amqpBinding
// ============================================================================

export function $amqpBinding(
  context: DecoratorContext,
  target: Namespace | Interface,
  bindings: AmqpChannelBindingsDef,
) {
  context.program.stateMap(AsyncApiStateKeys.amqpBinding).set(target, bindings);
}

export function getAmqpBinding(program: Program, target: Type): AmqpChannelBindingsDef | undefined {
  return program.stateMap(AsyncApiStateKeys.amqpBinding).get(target);
}

// ============================================================================
// @amqpOperationBinding
// ============================================================================

export function $amqpOperationBinding(
  context: DecoratorContext,
  target: Operation,
  bindings: AmqpOperationBindingsDef,
) {
  context.program.stateMap(AsyncApiStateKeys.amqpOperationBinding).set(target, bindings);
}

export function getAmqpOperationBinding(
  program: Program,
  target: Type,
): AmqpOperationBindingsDef | undefined {
  return program.stateMap(AsyncApiStateKeys.amqpOperationBinding).get(target);
}
