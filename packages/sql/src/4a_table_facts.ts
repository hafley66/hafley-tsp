import type { Model, Namespace, Program } from "@typespec/compiler";
import { getAllRelations } from "./1_decorators.js";
import { collectModels, isEntityModel, resolvedFields, snakeCase, type ResolvedField } from "./2_facts.js";
import { internStorage, type InternStorage } from "./3_intern.js";

export function columnName(field: ResolvedField): string {
  return field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name);
}

export interface TableColumn {
  name: string;
  typeName: string;
  nullable: boolean;
  field?: ResolvedField;
}
export interface TableFact {
  name: string;
  namespace?: Namespace;
  model?: Model;
  columns: TableColumn[];
}

// Physical tables, including dictionary and interned entity tables. Consumers
// use physical types here, while SQL's readable views retain logical spellings.
export function tableFacts(program: Program, storage: InternStorage = internStorage(program)): TableFact[] {
  const relations = getAllRelations(program);
  const tables: TableFact[] = collectModels(program.getGlobalNamespaceType())
    .filter(model => isEntityModel(program, model) && !storage.entities.some(e => e.model === model))
    .map(model => ({
      name: snakeCase(model.name), namespace: model.namespace, model,
      columns: resolvedFields(program, model, relations).map(field => ({
        name: columnName(field), typeName: field.rel?.kind === "belongsTo" ? "integer" : field.typeName,
        nullable: field.nullable, field,
      })),
    }));
  for (const domain of storage.domains) tables.push({
    name: domain.table, namespace: domain.scalar.namespace,
    columns: [{ name: "id", typeName: "integer", nullable: false }, { name: "value", typeName: "string", nullable: false }],
  });
  for (const entity of storage.entities) tables.push({
    name: entity.table, namespace: entity.model.namespace, model: entity.model,
    columns: entity.fields.map(field => ({
      name: field.column, typeName: field.domain || field.reference ? "integer" : field.typeName,
      nullable: field.nullable, field,
    })),
  });
  return tables;
}
