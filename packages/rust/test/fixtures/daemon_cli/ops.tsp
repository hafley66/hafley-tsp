import "../../../../decorator-def/lib/main.tsp"; // Daemon validator runs before HTTP validation.
import "@typespec/http";
import "@typespec/http/streams";

using Clap;
using Daemon;
using Http;
using Http.Streams;

scalar path extends string;
scalar jsonValue extends string;

model Inputs {
  @positional paths: string[];
  @valueName("DIR") root?: path;
}

model RootArgs {
  inputs: Inputs;
}

@service
@daemon(#{ idleSecs: 37, handshake: false })
@rootArgs(RootArgs)
namespace DaemonFixture;

op extract(args: RootArgs): JsonlStream<jsonValue>;
op ingest(@bodyRoot input: JsonlStream<jsonValue>): jsonValue;
