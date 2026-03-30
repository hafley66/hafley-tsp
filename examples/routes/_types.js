// Relation decorator stubs -- store metadata for emitters/codegen to read
const RELATIONS_KEY = Symbol("relations");

function storeRelation(ctx, target, kind) {
  const map = ctx.program.stateMap(RELATIONS_KEY);
  if (!map.has(target.model)) map.set(target.model, []);
  map.get(target.model).push({ property: target.name, kind });
}

export function $belongsTo(ctx, target) { storeRelation(ctx, target, "belongsTo"); }
export function $hasMany(ctx, target) { storeRelation(ctx, target, "hasMany"); }
export function $hasOne(ctx, target) { storeRelation(ctx, target, "hasOne"); }
export function $manyToMany(ctx, target) { storeRelation(ctx, target, "manyToMany"); }
