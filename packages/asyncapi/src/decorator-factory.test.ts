import { describe, expect, it } from "vitest";
import { flagDec, valueDec, objectDec, listDec, exclusiveDec } from "./decorator-factory.js";
import type { DecoratorContext, Program, Type } from "@typespec/compiler";

// Minimal mock of Program.stateMap -- each symbol gets its own Map
function mockProgram(): Program {
  const maps = new Map<symbol, Map<any, any>>();
  return {
    stateMap(key: symbol) {
      if (!maps.has(key)) maps.set(key, new Map());
      return maps.get(key)!;
    },
  } as any;
}

function mockContext(program: Program): DecoratorContext {
  return {
    program,
    decoratorTarget: {} as any,
  } as any;
}

function mockTarget(name = "test"): Type {
  return { kind: "Model", name } as any;
}

describe("decorator-factory", () => {
  describe("flagDec", () => {
    const key = Symbol("test-flag");
    const dec = flagDec(key);

    it("has() returns false before decoration", () => {
      const program = mockProgram();
      expect(dec.has(program, mockTarget())).toBe(false);
    });

    it("has() returns true after decoration", () => {
      const program = mockProgram();
      const target = mockTarget();
      dec.$decorator(mockContext(program), target);
      expect(dec.has(program, target)).toBe(true);
    });
  });

  describe("valueDec", () => {
    const key = Symbol("test-value");
    const dec = valueDec<string>(key);

    it("stores and retrieves a value", () => {
      const program = mockProgram();
      const target = mockTarget();
      dec.$decorator(mockContext(program), target, "hello");
      expect(dec.get(program, target)).toBe("hello");
    });

    it("returns undefined for undecorated target", () => {
      const program = mockProgram();
      expect(dec.get(program, mockTarget())).toBeUndefined();
    });
  });

  describe("objectDec", () => {
    const key = Symbol("test-object");
    const dec = objectDec<{ url: string; port: number }>(
      key,
      (_target, url: string, port: number) => ({ url, port }),
    );

    it("builds and stores structured value from args", () => {
      const program = mockProgram();
      const target = mockTarget();
      dec.$decorator(mockContext(program), target, "localhost", 8080);
      expect(dec.get(program, target)).toMatchInlineSnapshot(`
        {
          "port": 8080,
          "url": "localhost",
        }
      `);
    });

    it("passes target to build function", () => {
      const nameKey = Symbol("test-name");
      const nameDec = objectDec<{ name: string }>(
        nameKey,
        (target) => ({ name: (target as any).name }),
      );
      const program = mockProgram();
      const target = mockTarget("MyModel");
      nameDec.$decorator(mockContext(program), target);
      expect(nameDec.get(program, target)).toMatchInlineSnapshot(`
        {
          "name": "MyModel",
        }
      `);
    });
  });

  describe("listDec", () => {
    const key = Symbol("test-list");
    const dec = listDec<{ name: string }>(
      key,
      (_target, name: string) => ({ name }),
    );

    it("accumulates multiple applications", () => {
      const program = mockProgram();
      const target = mockTarget();
      const ctx = mockContext(program);
      dec.$decorator(ctx, target, "first");
      dec.$decorator(ctx, target, "second");
      dec.$decorator(ctx, target, "third");
      expect(dec.get(program, target)).toMatchInlineSnapshot(`
        [
          {
            "name": "first",
          },
          {
            "name": "second",
          },
          {
            "name": "third",
          },
        ]
      `);
    });

    it("returns undefined for undecorated target", () => {
      const program = mockProgram();
      expect(dec.get(program, mockTarget())).toBeUndefined();
    });
  });

  describe("exclusiveDec", () => {
    it("stores the value on first application", () => {
      const key = Symbol("test-exclusive");
      const dec = exclusiveDec<string>(key, "send");
      const program = mockProgram();
      const target = mockTarget();
      dec.$decorator(mockContext(program), target);
      expect(dec.get(program, target)).toBe("send");
    });

    it("rejects second application and calls onConflict", () => {
      const key = Symbol("test-exclusive");
      const conflicts: string[] = [];
      const sendDec = exclusiveDec<string>(key, "send", (_p, _t, name) => conflicts.push(name));
      const recvDec = exclusiveDec<string>(key, "receive", (_p, _t, name) => conflicts.push(name));

      const program = mockProgram();
      const target = mockTarget("myOp");
      sendDec.$decorator(mockContext(program), target);
      recvDec.$decorator(mockContext(program), target);

      expect(sendDec.get(program, target)).toBe("send");
      expect(conflicts).toMatchInlineSnapshot(`
        [
          "myOp",
        ]
      `);
    });

    it("allows different targets independently", () => {
      const key = Symbol("test-exclusive");
      const sendDec = exclusiveDec<string>(key, "send");
      const recvDec = exclusiveDec<string>(key, "receive");

      const program = mockProgram();
      const target1 = mockTarget("op1");
      const target2 = mockTarget("op2");
      sendDec.$decorator(mockContext(program), target1);
      recvDec.$decorator(mockContext(program), target2);

      expect(sendDec.get(program, target1)).toBe("send");
      expect(recvDec.get(program, target2)).toBe("receive");
    });
  });
});
