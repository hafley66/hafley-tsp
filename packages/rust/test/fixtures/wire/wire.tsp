// Fixture for the wire gaps: union shapes, keyword fields, HTTP-only transports,
// handler trait + state, module prefix, minimal imports, @error status mapping,
// the 500 catch-all body and the 422 JSON body rejection.
import "@typespec/http";

using Http;

@service(#{ title: "wire" })
namespace Wire;

/** One column value: untagged, the OpenAPI schema is `anyOf`. */
union Cell {
  text: string,
  int: int64,
}

model Circle {
  radius: float64;
}

model Square {
  side: float64;
}

/** Default envelope: `{ "kind": "circle", "value": {...} }`. */
@discriminated
union Shape {
  circle: Circle,
  square: Square,
}

/** No envelope: `{ "kind": "circle", "radius": 1 }`. */
@discriminated(#{ envelope: "none", discriminatorPropertyName: "kind" })
union Flat {
  circle: Circle,
  square: Square,
}

enum ColType {
  Text,
  Int,
}

model Column {
  name: string;
  type: ColType;
  mode: "fast" | "slow-ish";
  note: string | null;
}

model Change {
  rel: string;
  cells: Cell[];
  diff: int64;
}

model Delta {
  event: uint64;
  changes: Change[];
}

model Table {
  columns: string[];
  rows: Cell[][];
  shapes: Shape[];
  flat: Flat[];
}

model QueryRequest {
  sql: string;
}

@error
model QueryError {
  @statusCode _: 400;
  message: string;
}

@error
model Missing {
  @statusCode _: 404;
  what: string;
}

/** The server failed: the body of every `OpError::Internal`. */
@error
model ServerError {
  @statusCode _: 500;
  error: string;
}

/** A request body the JSON extractor cannot decode; `error` is axum's rejection text. */
@error
model BodyRejected {
  @statusCode _: 422;
  error: string;
}

@route("/commit") @post op commit(@body changes: Change[]): Delta | ServerError;
@route("/query") @post op query(@body request: QueryRequest): Table | QueryError | Missing | BodyRejected | ServerError;
@route("/plan") @get op plan(): Column[];
