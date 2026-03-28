// TEST: functions can receive namespaces and walk ops/models/children recursively
// TEST: functions can read decorator state (including op refs) from inspected ops
// EXPECT: compiles, console output shows full op tree with decorator edges
#suppress "experimental-feature" ""
import "../lib/reflect.tsp";
using Reflect;

namespace Orders {
  model Order { id: string; }

  namespace query {
    op get(id: string): Order;
    op list(): Order[];
  }

  namespace mut {
    namespace create {
      op manual(customerId: string): Order;
    }
    namespace update {
      op addItem(id: string, sku: string): Order;
      op submit(id: string): Order;
    }
    namespace delete {
      op cancel(id: string, reason: string): Order;
    }
  }

  namespace side {
    @timingAfter(Orders.mut.update.submit)
    op sendEmail(order: Order): void;
  }
}

alias OrdersGraph = dumpNs(Orders);
