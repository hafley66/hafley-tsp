// TEST: decorators can take Reflection.Operation as arguments
// EXPECT: compiles clean
import "../lib/reflect.tsp";

alias derp = "LOL";
model A {`x-derp`:  derp;}

alias B = A.`x-derp`;
const a:A = #{ `x-derp`: "LOL"};
namespace `Orders` {
  model Order { id: string; status: string; }

  namespace mut {
    namespace update {
      op submit(id: string): Order;
    }
  }

  namespace side {
    @timingAfter(Orders.mut.update.submit)
    op updateInventory(order: Order): void;

    @timingBefore(Orders.mut.update.submit)
    op validateStock(id: string): void;

    @timingOn(Orders.mut.update.submit)
    op sendEmail(order: Order): void;
  }
}
