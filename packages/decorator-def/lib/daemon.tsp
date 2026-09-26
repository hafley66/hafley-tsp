using TypeSpec.Reflection;

namespace Daemon;

model DaemonOptions {
  idleSecs: uint32;
  handshake: boolean;
}

extern dec daemon(target: Namespace, options: valueof DaemonOptions);
