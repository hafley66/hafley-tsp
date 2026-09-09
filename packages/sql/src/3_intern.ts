import { getNamespaceFullName, isTemplateDeclaration, walkPropertiesInherited, type Model, type Program, type Scalar, type Type } from "@typespec/compiler";
import { getAllRelations, getIndex, getInternScalar, getUnique } from "./1_decorators.js";
import { collectModels, isEntityModel, resolvedFields, snakeCase, type ResolvedField } from "./2_facts.js";

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
    const contains = (type: Type): boolean => {
      if (getInternScalar(program, type)) return true;
      if (type.kind === "Union") return [...type.variants.values()].some((variant) => contains(variant.type));
      return type.kind === "Model" && !!type.indexer && contains(type.indexer.value);
    };
    for (const prop of props) {
      if (contains(prop.type) && !getInternScalar(program, prop.type)) fail(`${model.name}.${prop.name}: interned arrays and multi-value unions require an explicit relation model`);
    }
    if (!props.some((prop) => getInternScalar(program, prop.type)) || isTemplateDeclaration(model)) continue;
    const flattened = { ...model, properties: new Map(props.map((prop) => [prop.name, prop])) } as Model;
    const fields = resolvedFields(program, flattened, relations).map((field): InternField => {
      const scalar = getInternScalar(program, field.prop.type);
      let domain: InternDomain | undefined;
      if (scalar) {
        domain = domains.get(scalar);
        if (!domain) { domain = { scalar, table: qualified(scalar) }; domains.set(scalar, domain); }
        if (field.rel || field.isManual || field.isPk || field.default !== undefined || field.prop.defaultValue !== undefined) {
          fail(`${model.name}.${field.name}: interned fields cannot also have a relation, primary key, manual marker, or default`);
        }
      }
      let reference: InternField["reference"];
      if (field.rel) {
        let target = field.prop.type;
        if (target.kind === "Union") {
          const nonNull = [...target.variants.values()].map((variant) => variant.type)
            .filter((type) => !(type.kind === "Intrinsic" && type.name === "null"));
          if (nonNull.length === 1) target = nonNull[0];
        }
        if (field.rel.kind !== "belongsTo" || target.kind !== "Model") fail(`${model.name}.${field.name}: expected a belongsTo model reference`);
        const targetModel = target as Model;
        const targetFields = resolvedFields(program, targetModel, relations);
        const keys = targetFields.filter((candidate) => candidate.isPk);
        if (keys.length !== 1 || !["integer", "int64"].includes(keys[0].typeName)) fail(`${model.name}.${field.name}: reference target requires one integer primary key`);
        reference = {
          table: [...walkPropertiesInherited(targetModel)].some((prop) => getInternScalar(program, prop.type)) ? qualified(targetModel) : snakeCase(targetModel.name),
          column: keys[0].name,
        };
      }
      const supported = ["string", "boolean", "bytes", "integer", "int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "float", "float32", "float64"];
      if (!domain && !reference && !supported.includes(field.typeName)) fail(`${model.name}.${field.name}: unsupported storage scalar ${field.typeName}`);
      if (field.isManual) fail(`${model.name}.${field.name}: manual fields require a custom writer`);
      return { ...field, nullable: field.nullable || field.prop.optional, domain, reference, column: domain || reference ? `${field.name}_id` : field.name };
    });
    if (new Set(fields.map((field) => field.column.toLowerCase())).size !== fields.length) fail(`${model.name}: generated column name collision`);
    const keys = fields.filter((field) => field.isPk);
    if (keys.length > 1 || keys.some((field) => !["integer", "int64"].includes(field.typeName) || field.nullable)) fail(`${model.name}: expected at most one non-null integer primary key`);
    const physical = (names: string[]) => names.map((name) => fields.find((field) => field.name === name)?.column ?? fail(`${model.name}: unknown key field ${name}`));
    const table = qualified(model);
    entities.push({
      model, table, view: `${table}_text`, fields,
      unique: fields.flatMap((field) => (getUnique(program, field.prop) ?? []).map((item) => physical(item.fields))),
      indexes: fields.flatMap((field) => (getIndex(program, field.prop) ?? []).map((item) => physical(item.fields))),
    });
  }

  const names = new Set<string>();
  const register = (name: string) => {
    const folded = name.toLowerCase();
    if (names.has(folded)) fail(`SQL name collision: ${name}`);
    names.add(folded);
  };
  for (const model of models.filter((item) => isEntityModel(program, item) && !entities.some((entity) => entity.model === item))) register(snakeCase(model.name));
  for (const domain of domains.values()) register(domain.table);
  for (const entity of entities) {
    register(entity.table);
    register(entity.view);
    entity.indexes.forEach((_, index) => register(`${entity.table}_index_${index}`));
    if (entity.unique.some((key) => !key.length) || entity.indexes.some((key) => !key.length)) fail(`${entity.table}: empty unique/index key`);
  }
  return { domains: [...domains.values()], entities };
}
