import "../../../../decorator-def/lib/main.tsp"; // Daemon validator runs before HTTP validation.
import "@typespec/http";
import "@typespec/http/streams";

using Clap;
using Daemon;
using Http;
using Http.Streams;

@service
@daemon(#{ idleSecs: 37, handshake: false, serverBin: "probe-daemon" })
@rootArgs(RootArgs)
namespace DaemonFixture;

scalar path extends string;
scalar jsonValue extends string;

model Inputs {
  @positional paths: string[];
  @valueName("DIR") root?: path;
}

model RootArgs {
  inputs: Inputs;
}

op extract(args: RootArgs): JsonlStream<jsonValue>;
op ingest(@bodyRoot input: JsonlStream<jsonValue>): jsonValue;
