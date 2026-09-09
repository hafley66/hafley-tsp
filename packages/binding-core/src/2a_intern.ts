// One storage projection shared by the SQL and Rust emitters. Source types
// remain unchanged: a string at the boundary becomes an integer in storage.
import { getNamespaceFullName, isTemplateDeclaration, walkPropertiesInherited, type Model, type Program, type Scalar } from "@typespec/compiler";
import { collectModels, isEntityModel, resolvedFields, snakeCase, type ResolvedField } from "./2_facts.js";
import { getAllRelations, getInternScalar, getUnique, getIndex, hasBinding, getBinding, hasSyncStrategy } from "./decorators.js";

export interface InternDomain { scalar: Scalar; table: string; }
export interface InternField extends ResolvedField {
  column: string;
  domain?: InternDomain;
  reference?: { table: string; column: string };
}
export interface InternEntity {
  model: Model;
  table: string;
  view: string;
  fields: InternField[];
  unique: string[][];
  indexes: string[][];
}
export interface InternStorage { domains: InternDomain[]; entities: InternEntity[]; }

export function quoteSql(name: string): string { return `"${name.replaceAll('"', '""')}"`; }

function qualified(type: Model | Scalar): string {
  return [type.namespace ? getNamespaceFullName(type.namespace) : "", type.name].filter(Boolean).join(".").replaceAll(".", "__");
}

export function internStorage(program: Program): InternStorage {
  const models = collectModels(program.getGlobalNamespaceType());
  const relations = getAllRelations(program);
  const domains = new Map<Scalar, InternDomain>();
  const entities: InternEntity[] = [];
  const fail = (reason: string): never => { throw new Error(`Invalid interning declaration: ${reason}`); };

  for (const model of models) {
    const props = [...walkPropertiesInherited(model)];
    // An array or multi-value union cannot silently lose an intern annotation.
    const contains = (type: import("@typespec/compiler").Type): boolean => {
      if (getInternScalar(program, type)) return true;
      if (type.kind === "Union") return [...type.variants.values()].some(v => contains(v.type));
      return type.kind === "Model" && !!type.indexer && contains(type.indexer.value);
    };
    for (const prop of props) {
      if (contains(prop.type) && !getInternScalar(program, prop.type)) fail(`${model.name}.${prop.name}: interned arrays and multi-value unions require an explicit relation model`);
    }
    if (!props.some(p => getInternScalar(program, p.type))) continue;
    if (isTemplateDeclaration(model)) continue;
    if (hasSyncStrategy(program, model)) fail(`${model.name}: custom sync strategies are not supported for interned entities`);
    const flattened = { ...model, properties: new Map(props.map(p => [p.name, p])) } as Model;
    const fields = resolvedFields(program, flattened, relations).map(f => {
      const scalar = getInternScalar(program, f.prop.type);
      let domain: InternDomain | undefined;
      if (scalar) {
        domain = domains.get(scalar);
        if (!domain) { domain = { scalar, table: qualified(scalar) }; domains.set(scalar, domain); }
        if (f.rel || f.isManual || f.isPk || f.default !== undefined || f.prop.defaultValue !== undefined) {
          fail(`${model.name}.${f.name}: interned fields cannot also have a relation, primary key, manual marker, or default`);
        }
      }
      let reference: InternField["reference"];
      if (f.rel) {
        let target = f.prop.type;
        if (target.kind === "Union") {
          const nonNull = [...target.variants.values()].map(v => v.type).filter(t => !(t.kind === "Intrinsic" && t.name === "null"));
          if (nonNull.length === 1) target = nonNull[0];
        }
        if (f.rel.kind !== "belongsTo" || target.kind !== "Model") fail(`${model.name}.${f.name}: expected a belongsTo model reference`);
        const targetModel = target as Model;
        const targetFields = resolvedFields(program, targetModel, relations);
        const pk = targetFields.filter(f => f.isPk);
        if (pk.length !== 1 || !["integer", "int64"].includes(pk[0].typeName)) fail(`${model.name}.${f.name}: reference target requires one integer primary key`);
        reference = { table: [...walkPropertiesInherited(targetModel)].some(p => getInternScalar(program, p.type)) ? qualified(targetModel) : snakeCase(targetModel.name), column: pk[0].name };
      }
      if (!domain && !reference && !["string", "boolean", "bytes", "integer", "int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "float", "float32", "float64"].includes(f.typeName)) fail(`${model.name}.${f.name}: unsupported storage scalar ${f.typeName}`);
      if (f.isManual) fail(`${model.name}.${f.name}: manual fields require a custom writer`);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.name) || ["self", "Self", "super", "crate"].includes(f.name)) fail(`${model.name}.${f.name}: unsupported Rust field identifier`);
      return { ...f, nullable: f.nullable || f.prop.optional, domain, reference, column: domain || reference ? `${f.name}_id` : f.name };
    });
    if (new Set(fields.map(f => f.column.toLowerCase())).size !== fields.length) fail(`${model.name}: generated column name collision`);
    const keys = fields.filter(f => f.isPk);
    if (keys.length > 1 || keys.some(f => !["integer", "int64"].includes(f.typeName) || f.nullable)) fail(`${model.name}: expected at most one non-null integer primary key`);
    const physical = (names: string[]) => names.map(name => fields.find(f => f.name === name)?.column ?? fail(`${model.name}: unknown key field ${name}`));
    const table = qualified(model);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) || ["self", "Self", "super", "crate"].includes(table)) fail(`${table}: unsupported Rust type identifier`);
    entities.push({ model, table, view: `${table}_text`, fields,
      unique: fields.flatMap(f => (getUnique(program, f.prop) ?? []).map(u => physical(u.fields))),
      indexes: fields.flatMap(f => (getIndex(program, f.prop) ?? []).map(i => physical(i.fields))),
    });
  }

  // Fail explicitly until the existing source/sync adapters accept string
  // parameters through this transactional writer, rather than emitting bad code.
  for (const model of models.filter(m => hasBinding(program, m))) {
    const target = getBinding(program, model)!.targetModel;
    if (entities.some(e => e.model === target)) fail(`${model.name}: @Bind.from to an interned entity is not supported yet`);
  }
  const names = new Set<string>();
  const register = (name: string) => {
    const folded = name.toLowerCase();
    if (names.has(folded)) fail(`SQL name collision: ${name}`);
    names.add(folded);
  };
  for (const m of models.filter(m => isEntityModel(program, m) && !entities.some(e => e.model === m))) {
    register(snakeCase(m.name));
  }
  for (const d of domains.values()) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(d.table)) fail(`${d.table}: unsupported Rust domain identifier`);
    register(d.table);
  }
  for (const e of entities) {
    register(e.table); register(e.view);
    e.indexes.forEach((_, i) => register(`${e.table}_index_${i}`));
    if (e.unique.some(k => !k.length) || e.indexes.some(k => !k.length)) fail(`${e.table}: empty unique/index key`);
  }
  return { domains: [...domains.values()], entities };
}
