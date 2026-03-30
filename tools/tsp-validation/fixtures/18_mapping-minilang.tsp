// TEST: cursor model for mapping mini-lang
// EXPECT: compiles clean
#suppress "experimental-feature" ""
import "../lib/reflect.tsp";
using Reflect;

scalar NsPath extends string;
scalar NsName extends string;
scalar NsMethod extends string;

model Ns {
  path: NsPath;
  name: NsName;
  method: NsMethod;
}

// Using Ns.x as property types works (not as template args)
model RoutesPattern {
  path: Ns.path;
  name: Ns.name;
  method: Ns.method;
}

// Backtick key with Ns.path as type
model RoutesPattern2 {
  `Ns.path`: Ns.method;
}

// Can the fn read what RoutesPattern.path resolves to?
alias Dump = dumpOp(op test(input: RoutesPattern): RoutesPattern);
