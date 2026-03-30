#suppress "experimental-feature" ""
import "./inspect.tsp";
using Inspect;

scalar NsPath extends string;
scalar NsName extends string;
scalar NsMethod extends string;

model Ns {
  path: NsPath;
  name: NsName;
  method: NsMethod;
}

// Option A: flat inline model, no template args needed
model RoutesPattern {
  `Ns.path`: {
    path: Ns.path;
    method: Ns.method;
    name: Ns.name;
  };
}

alias _ = dumpModel(RoutesPattern);

