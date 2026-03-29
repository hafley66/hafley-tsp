// TEST: can namespace names be quoted strings?
// EXPECT: unknown -- testing if TSP allows this syntax

// Attempt 1: quoted string namespace
// namespace "/users" {
//   op list(): string[];
// }

// Attempt 2: backtick namespace (some languages allow this for reserved words)
// namespace `users route` {
//   op list(): string[];
// }

// Attempt 3: nested namespaces matching route segments
namespace routes {
  namespace users {
    namespace userId {
      op get(userId: string): string;
    }
  }
  namespace orders {
    namespace orderId {
      namespace items {
        op list(orderId: string): string[];
      }
    }
  }
}

// This compiles for sure -- question is whether quoted forms also work
// Commenting out quoted forms so this fixture passes baseline
// Uncomment to test individually
