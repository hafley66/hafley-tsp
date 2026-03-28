// TEST: model templates as composition operators (Sequence, Parallel, Choice, Loop)
// EXPECT: compiles clean, nested generics work

namespace Composition {
  model Sequence<A, B> { first: A; then: B; }
  model Parallel<A, B> { left: A; right: B; }
  model Choice<A, B> { either: A; or: B; }
  model Loop<A> { repeat: A; }

  model Op<TIn, TOut> { in: TIn; out: TOut; }

  model Step1 is Op<string, int32>;
  model Step2 is Op<int32, boolean>;
  model Step3 is Op<boolean, string>;

  model SimpleFlow is Sequence<Step1, Step2>;
  model ParallelFlow is Parallel<Step1, Step2>;
  model NestedFlow is Sequence<Step1, Sequence<Step2, Step3>>;
  model ComplexFlow is Sequence<Step1, Choice<Sequence<Step2, Step3>, Step1>>;
}
