import "@typespec/http";
import "@typespec/openapi";
using TypeSpec.Http;
using TypeSpec.OpenAPI;
@service
@doc("Fixture commands")
namespace Fixture;
/** Read one entry */
@route("/entry/read/{id}") @get
op read_entry(@path id: int64, @query("output-format") format?: string): void;
/** Write an entry */
@route("/entry/write") @post
op write_entry(@query @extension("x-clap-short", "v") verbose?: boolean): void;
