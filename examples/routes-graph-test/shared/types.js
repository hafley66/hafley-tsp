const REL_KEY = Symbol.for("hafley:relations");

function getParentModelName(target) {
  // target is ModelProperty. Walk up AST nodes to find parent ModelStatement.
  let node = target.node;
  while (node) {
    // ModelStatement has an .id with .sv (string value)
    if (node.id?.sv && node.properties) {
      return node.id.sv;
    }
    node = node.parent;
  }
  // Fallback: try the type system path
  return target.name || "?";
}

function rel(ctx, target, kind) {
  const map = ctx.program.stateMap(REL_KEY);
  const modelName = getParentModelName(target);
  if (!map.has(modelName)) map.set(modelName, []);
  map.get(modelName).push({ property: target.name, kind, targetType: target.type });
}
export function $belongsTo(ctx, target) { rel(ctx, target, "belongsTo"); }
export function $hasMany(ctx, target) { rel(ctx, target, "hasMany"); }
export function $manyToMany(ctx, target) { rel(ctx, target, "manyToMany"); }
