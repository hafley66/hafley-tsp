import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@hafley/typespec-asyncapi",
  diagnostics: {
    "duplicate-direction": {
      severity: "error",
      messages: {
        default: paramMessage`Operation "${"name"}" has both @send and @receive. Pick one.`,
      },
    },
    "missing-direction": {
      severity: "warning",
      messages: {
        default: paramMessage`Operation "${"name"}" on a @channel has no @send or @receive. Direction will be inferred as @receive.`,
      },
    },
    "channel-address-missing-param": {
      severity: "error",
      messages: {
        default: paramMessage`Channel address references parameter "${"param"}" but it was not found in any operation.`,
      },
    },
    "reply-without-direction": {
      severity: "error",
      messages: {
        default: "@reply requires @send or @receive on the operation.",
      },
    },
  },
  state: {
    servers: { description: "State for @server decorator" },
    channel: { description: "State for @channel decorator" },
    direction: { description: "State for @send / @receive decorators" },
    reply: { description: "State for @reply decorator" },
    correlationId: { description: "State for @correlationId decorator" },
    payload: { description: "State for @payload decorator" },
    messageHeader: { description: "State for @messageHeader decorator" },
    contentType: { description: "State for @contentType decorator" },
    amqpBinding: { description: "State for @amqpBinding decorator" },
    amqpOperationBinding: { description: "State for @amqpOperationBinding decorator" },
  },
});

export const { reportDiagnostic, createDiagnostic, stateKeys: AsyncApiStateKeys } = $lib;
