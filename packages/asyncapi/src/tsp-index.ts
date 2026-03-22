import {
  $server,
  $channel,
  $send,
  $receive,
  $reply,
  $correlationId,
  $payload,
  $messageHeader,
  $contentType,
  $amqpBinding,
  $amqpOperationBinding,
} from "./decorators.js";

export { $lib } from "./lib.js";

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
