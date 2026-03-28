// TEST: op `is` copies signature across namespaces
// EXPECT: compiles clean

namespace ServiceA {
  model Foo { x: string; }
  op getFoo(id: string): Foo;
}

namespace ServiceB {
  namespace deps {
    op getFoo is ServiceA.getFoo;
  }
}

namespace ServiceC {
  op myOp is ServiceA.getFoo;
}
