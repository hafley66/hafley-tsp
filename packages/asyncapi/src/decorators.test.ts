import { describe, expect, it } from "vitest";
import {
  $server, $channel, $send, $receive, $reply,
  $correlationId, $payload, $messageHeader,
  $contentType, $amqpBinding, $amqpOperationBinding,
  getServers, getChannelAddress, isChannel, getDirection,
  getReply, getCorrelationId, isPayload, getMessageHeader,
  isMessageHeader, getContentType, getAmqpBinding, getAmqpOperationBinding,
} from "./decorators.js";
import { AsyncApiStateKeys } from "./lib.js";
import type { DecoratorContext, Program, Type } from "@typespec/compiler";

function mockProgram(): Program {
  const maps = new Map<symbol, Map<any, any>>();
  return {
    stateMap(key: symbol) {
      if (!maps.has(key)) maps.set(key, new Map());
      return maps.get(key)!;
    },
    reportDiagnostic() {},  // swallow diagnostics in tests
  } as any;
}

function mockContext(program: Program): DecoratorContext {
  return { program, decoratorTarget: {} as any } as any;
}

function mockTarget(name = "test"): Type {
  return { kind: "Model", name } as any;
}

describe("asyncapi decorators (factory-backed)", () => {
  it("@server accumulates multiple servers", () => {
    const program = mockProgram();
    const target = mockTarget("MyService");
    const ctx = mockContext(program);
    $server(ctx, target as any, "rabbitmq.example.org", "amqp");
    $server(ctx, target as any, "api.example.com", "http", { protocolVersion: "2.0" });
    expect(getServers(program, target)).toMatchInlineSnapshot(`
      [
        {
          "pathname": undefined,
          "protocol": "amqp",
          "protocolVersion": undefined,
          "url": "rabbitmq.example.org",
        },
        {
          "pathname": undefined,
          "protocol": "http",
          "protocolVersion": "2.0",
          "url": "api.example.com",
        },
      ]
    `);
  });

  it("@channel stores address, isChannel checks presence", () => {
    const program = mockProgram();
    const target = mockTarget("Events");
    $channel(mockContext(program), target as any, "/users/{userId}/events");
    expect(getChannelAddress(program, target)).toBe("/users/{userId}/events");
    expect(isChannel(program, target)).toBe(true);
    expect(isChannel(program, mockTarget("Other"))).toBe(false);
  });

  it("@send and @receive are mutually exclusive", () => {
    const program = mockProgram();
    const target = mockTarget("op1");
    const ctx = mockContext(program);
    $send(ctx, target as any);
    expect(getDirection(program, target)).toBe("send");

    // second application should be rejected (value stays "send")
    $receive(ctx, target as any);
    expect(getDirection(program, target)).toBe("send");
  });

  it("@send and @receive work on different targets", () => {
    const program = mockProgram();
    const t1 = mockTarget("op1");
    const t2 = mockTarget("op2");
    const ctx = mockContext(program);
    $send(ctx, t1 as any);
    $receive(ctx, t2 as any);
    expect(getDirection(program, t1)).toBe("send");
    expect(getDirection(program, t2)).toBe("receive");
  });

  it("@reply stores reply config", () => {
    const program = mockProgram();
    const target = mockTarget("sum");
    $reply(mockContext(program), target as any, { addressExpr: "$message.header#/replyTo" });
    expect(getReply(program, target)).toMatchInlineSnapshot(`
      {
        "addressExpr": "$message.header#/replyTo",
        "channel": undefined,
      }
    `);
  });

  it("@correlationId stores location string", () => {
    const program = mockProgram();
    const target = mockTarget("sum");
    $correlationId(mockContext(program), target as any, "$message.header#/correlationId");
    expect(getCorrelationId(program, target)).toBe("$message.header#/correlationId");
  });

  it("@payload sets flag", () => {
    const program = mockProgram();
    const target = mockTarget("data");
    expect(isPayload(program, target)).toBe(false);
    $payload(mockContext(program), target as any);
    expect(isPayload(program, target)).toBe(true);
  });

  it("@messageHeader stores name, defaults to target.name", () => {
    const program = mockProgram();
    const explicit = mockTarget("requestId");
    $messageHeader(mockContext(program), explicit as any, "x-request-id");
    expect(getMessageHeader(program, explicit)).toMatchInlineSnapshot(`
      {
        "name": "x-request-id",
      }
    `);

    const implicit = mockTarget("correlationId");
    $messageHeader(mockContext(program), implicit as any);
    expect(getMessageHeader(program, implicit)).toMatchInlineSnapshot(`
      {
        "name": "correlationId",
      }
    `);
  });

  it("@contentType stores media type", () => {
    const program = mockProgram();
    const target = mockTarget("Events");
    $contentType(mockContext(program), target as any, "application/json");
    expect(getContentType(program, target)).toBe("application/json");
  });

  it("@amqpBinding stores channel bindings", () => {
    const program = mockProgram();
    const target = mockTarget("RpcService");
    $amqpBinding(mockContext(program), target as any, { is: "queue", queue: { durable: false, exclusive: true } });
    expect(getAmqpBinding(program, target)).toMatchInlineSnapshot(`
      {
        "is": "queue",
        "queue": {
          "durable": false,
          "exclusive": true,
        },
      }
    `);
  });

  it("@amqpOperationBinding stores operation bindings", () => {
    const program = mockProgram();
    const target = mockTarget("onOrder");
    $amqpOperationBinding(mockContext(program), target as any, { ack: true, deliveryMode: 2 });
    expect(getAmqpOperationBinding(program, target)).toMatchInlineSnapshot(`
      {
        "ack": true,
        "deliveryMode": 2,
      }
    `);
  });
});
