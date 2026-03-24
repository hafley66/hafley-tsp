// Public API -- re-export all accessor functions for emitters to use
export {
  type ServerDef,
  type Direction,
  type ReplyDef,
  getServer,
  hasServer,
  getChannel,
  hasChannel,
  getDirection,
  getReply,
  hasReply,
  getCorrelationId,
  hasCorrelationId,
  isPayload,
  getMessageHeader,
  hasMessageHeader,
  getContentType,
  hasContentType,
  getAmqpBinding,
  hasAmqpBinding,
  getAmqpOperationBinding,
  hasAmqpOperationBinding,
} from "./decorators.js";

export type {
  AmqpChannelBindingsDef,
  AmqpOperationBindingsDef,
} from "./0_types.js";

export { $lib, AsyncApiStateKeys } from "./lib.js";
