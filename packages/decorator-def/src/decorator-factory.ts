/**
 * Decorator factory -- stamps out $decorator + getter/checker from minimal config.
 *
 * Shapes:
 *   flagDec       -- @payload: stores true
 *   valueDec      -- @channel("addr"): stores a single value
 *   objectDec     -- @reply(opts): builds + stores structured value
 *   listDec       -- @server(...): accumulates into array
 *   exclusiveDec  -- @send/@receive: two decorators, one key, conflict = diagnostic
 */

import type {
  DecoratorContext,
  DiagnosticTarget,
  Program,
  Type,
} from "@typespec/compiler";

// --------------------------------------------------------------------------
// Flag: stores true, no value argument
// --------------------------------------------------------------------------

export interface FlagDec {
  $decorator: (context: DecoratorContext, target: Type) => void;
  has: (program: Program, target: Type) => boolean;
}

export function flagDec(key: symbol): FlagDec {
  return {
    $decorator(context, target) {
      context.program.stateMap(key).set(target, true);
    },
    has(program, target) {
      return program.stateMap(key).has(target);
    },
  };
}

// --------------------------------------------------------------------------
// Value: stores a single typed value
// --------------------------------------------------------------------------

export interface ValueDec<T> {
  $decorator: (context: DecoratorContext, target: Type, value: T) => void;
  get: (program: Program, target: Type) => T | undefined;
  has: (program: Program, target: Type) => boolean;
}

export function valueDec<T>(key: symbol): ValueDec<T> {
  return {
    $decorator(context, target, value) {
      context.program.stateMap(key).set(target, value);
    },
    get(program, target) {
      return program.stateMap(key).get(target);
    },
    has(program, target) {
      return program.stateMap(key).has(target);
    },
  };
}

// --------------------------------------------------------------------------
// Object: builds a structured value from decorator args
// --------------------------------------------------------------------------

export interface ObjectDec<T> {
  $decorator: (context: DecoratorContext, target: Type, ...args: any[]) => void;
  get: (program: Program, target: Type) => T | undefined;
  has: (program: Program, target: Type) => boolean;
}

export function objectDec<T>(
  key: symbol,
  build: (target: Type, ...args: any[]) => T,
): ObjectDec<T> {
  return {
    $decorator(context, target, ...args) {
      context.program.stateMap(key).set(target, build(target, ...args));
    },
    get(program, target) {
      return program.stateMap(key).get(target);
    },
    has(program, target) {
      return program.stateMap(key).has(target);
    },
  };
}

// --------------------------------------------------------------------------
// List: accumulates values (decorator can be applied multiple times)
// --------------------------------------------------------------------------

export interface ListDec<T> {
  $decorator: (context: DecoratorContext, target: Type, ...args: any[]) => void;
  get: (program: Program, target: Type) => T[] | undefined;
  has: (program: Program, target: Type) => boolean;
}

export function listDec<T>(
  key: symbol,
  build: (target: Type, ...args: any[]) => T,
): ListDec<T> {
  return {
    $decorator(context, target, ...args) {
      const map = context.program.stateMap(key);
      let list: T[] = map.get(target);
      if (!list) {
        list = [];
        map.set(target, list);
      }
      list.push(build(target, ...args));
    },
    get(program, target) {
      return program.stateMap(key).get(target);
    },
    has(program, target) {
      return program.stateMap(key).has(target);
    },
  };
}

// --------------------------------------------------------------------------
// Exclusive: two decorators write different values to the same key.
// Second application is an error.
// --------------------------------------------------------------------------

export interface ExclusiveDec<T> {
  $decorator: (context: DecoratorContext, target: Type) => void;
  get: (program: Program, target: Type) => T | undefined;
  has: (program: Program, target: Type) => boolean;
}

export function exclusiveDec<T>(
  key: symbol,
  value: T,
  onConflict?: (program: Program, target: DiagnosticTarget, name: string) => void,
): ExclusiveDec<T> {
  return {
    $decorator(context, target) {
      const existing = context.program.stateMap(key).get(target);
      if (existing !== undefined) {
        if (onConflict) {
          onConflict(context.program, context.decoratorTarget, (target as any).name ?? "");
        }
        return;
      }
      context.program.stateMap(key).set(target, value);
    },
    get(program, target) {
      return program.stateMap(key).get(target);
    },
    has(program, target) {
      return program.stateMap(key).has(target);
    },
  };
}
