// TEST: model property access depth
// EXPECT: A.b works (1 level), A.b.c FAILS

namespace PropAccess {
  model C { value: string; }
  model B { c: C; }
  model A { b: B; }

  // single level: works, resolves to type B
  alias AB = A.b;

  // use as field type: works
  model UsesAB { ref: A.b; }

  // multi-level: DOES NOT COMPILE
  // Uncomment to verify it still fails:
  // alias ABC = A.b.c;  // error: "Cannot resolve 'c' in node ModelProperty"
}
