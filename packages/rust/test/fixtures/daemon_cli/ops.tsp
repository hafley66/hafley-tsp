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
  @positional paths: path[];
  @valueName("DIR") root?: path;
}

model RootArgs {
  inputs: Inputs;
}

model RawByteStream is HttpStream<bytes, "application/octet-stream", bytes>;

op extract(@bodyIgnore args: RootArgs, @bodyRoot input: RawByteStream): JsonlStream<jsonValue>;
op ingest(@bodyRoot input: RawByteStream): jsonValue;
