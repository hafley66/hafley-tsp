import type { Program, Type } from "@typespec/compiler";
import { AsyncApiStateKeys, reportDiagnostic } from "./lib.js";
import { flagDec, valueDec, objectDec, listDec, exclusiveDec } from "@hafley/typespec-decorator-def/factory";
import type { AmqpChannelBindingsDef, AmqpOperationBindingsDef } from "./0_types.js";

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
  (_target, url, protocol, options) => ({ url, protocol, protocolVersion: options?.protocolVersion, pathname: options?.pathname }),
);
const _channel = valueDec<string>(AsyncApiStateKeys.channel);
const _send = exclusiveDec<string>(AsyncApiStateKeys.direction, "send", onDuplicateDirection);
const _receive = exclusiveDec<string>(AsyncApiStateKeys.direction, "receive", onDuplicateDirection);
const _reply = objectDec<ReplyDef>(AsyncApiStateKeys.reply,
  (_target, options) => ({ channel: options?.channel, addressExpr: options?.addressExpr }),
);
const _correlationId = valueDec<string>(AsyncApiStateKeys.correlationId);
const _payload = flagDec(AsyncApiStateKeys.payload);
const _messageHeader = valueDec<string>(AsyncApiStateKeys.messageHeader);
const _contentType = valueDec<string>(AsyncApiStateKeys.contentType);
const _amqpBinding = valueDec<AmqpChannelBindingsDef>(AsyncApiStateKeys.amqpBinding);
const _amqpOperationBinding = valueDec<AmqpOperationBindingsDef>(AsyncApiStateKeys.amqpOperationBinding);

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
