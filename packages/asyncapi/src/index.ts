// Public API -- re-export all accessor functions for emitters to use
export {
  type ServerDef,
  type Direction,
  type ReplyDef,
  type MessageHeaderDef,
  type AmqpChannelBindingsDef,
  type AmqpOperationBindingsDef,
  getServers,
  getChannelAddress,
  isChannel,
  getDirection,
  getReply,
  getCorrelationId,
  isPayload,
  getMessageHeader,
  isMessageHeader,
  getContentType,
  getAmqpBinding,
  getAmqpOperationBinding,
} from "./decorators.js";

export { $lib, AsyncApiStateKeys } from "./lib.js";
