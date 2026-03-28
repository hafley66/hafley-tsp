// TEST: nested namespaces with ops, full entity convention
// EXPECT: compiles clean

namespace Orders {
  model Order { id: string; status: string; }
  model Filter { status?: string; }

  namespace query {
    op get(id: string): Order;
    op list(filter?: Filter): Order[];
  }

  namespace mut {
    namespace create {
      op manual(name: string): Order;
      op fromCart(cartId: string): Order;
    }
    namespace update {
      op addItem(id: string, sku: string): Order;
    }
    namespace delete {
      op cancel(id: string, reason: string): Order;
    }
  }
}
