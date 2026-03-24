import type { Type } from "@typespec/compiler";
import { AsyncApiStateKeys, reportDiagnostic } from "./lib.js";
import { flagDec, valueDec, objectDec, listDec, exclusiveDec } from "./decorator-factory.js";

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

// ---- Decorator instances ----

function onDuplicateDirection(program: Parameters<typeof reportDiagnostic>[0], target: import("@typespec/compiler").DiagnosticTarget, name: string) {
  reportDiagnostic(program, {
    code: "duplicate-direction",
    format: { name },
    target,
  });
}

const _server = listDec<ServerDef>(
  AsyncApiStateKeys.servers,
  (_target, url: string, protocol: string, options?: { protocolVersion?: string; pathname?: string }) => ({
    url,
    protocol,
    protocolVersion: options?.protocolVersion,
    pathname: options?.pathname,
  }),
);

const _channel       = valueDec<string>(AsyncApiStateKeys.channel);
const _send          = exclusiveDec<Direction>(AsyncApiStateKeys.direction, "send", onDuplicateDirection);
const _receive       = exclusiveDec<Direction>(AsyncApiStateKeys.direction, "receive", onDuplicateDirection);
const _reply         = objectDec<ReplyDef>(
  AsyncApiStateKeys.reply,
  (_target, options?: { channel?: string; addressExpr?: string }) => ({
    channel: options?.channel,
    addressExpr: options?.addressExpr,
  }),
);
const _correlationId = valueDec<string>(AsyncApiStateKeys.correlationId);
const _payload       = flagDec(AsyncApiStateKeys.payload);
const _messageHeader = objectDec<MessageHeaderDef>(
  AsyncApiStateKeys.messageHeader,
  (target: Type, name?: string) => ({ name: name ?? (target as any).name ?? "" }),
);
const _contentType   = valueDec<string>(AsyncApiStateKeys.contentType);
const _amqpBinding   = valueDec<AmqpChannelBindingsDef>(AsyncApiStateKeys.amqpBinding);
const _amqpOpBinding = valueDec<AmqpOperationBindingsDef>(AsyncApiStateKeys.amqpOperationBinding);

// ---- Exports: $decorator functions (for tsp-index.ts) ----

export const $server              = _server.$decorator;
export const $channel             = _channel.$decorator;
export const $send                = _send.$decorator;
export const $receive             = _receive.$decorator;
export const $reply               = _reply.$decorator;
export const $correlationId       = _correlationId.$decorator;
export const $payload             = _payload.$decorator;
export const $messageHeader       = _messageHeader.$decorator;
export const $contentType         = _contentType.$decorator;
export const $amqpBinding         = _amqpBinding.$decorator;
export const $amqpOperationBinding = _amqpOpBinding.$decorator;

// ---- Exports: accessors (for emitters via index.ts) ----

export const getServers              = _server.get;
export const getChannelAddress       = _channel.get;
export const isChannel               = _channel.has;
export const getDirection            = _send.get;   // same key for send/receive
export const getReply                = _reply.get;
export const getCorrelationId        = _correlationId.get;
export const isPayload               = _payload.has;
export const getMessageHeader        = _messageHeader.get;
export const isMessageHeader         = _messageHeader.has;
export const getContentType          = _contentType.get;
export const getAmqpBinding          = _amqpBinding.get;
export const getAmqpOperationBinding = _amqpOpBinding.get;
