// Neutral type definitions -- language-agnostic descriptions of models and enums.
// These are the input to any TargetLang implementation.

export interface ScalarType {
  kind: "scalar";
  name: string;
}

export interface ArrayType {
  kind: "array";
  element: PropertyType;
}

export interface MapType {
  kind: "map";
  key: ScalarType;
  value: PropertyType;
}

export interface ModelRef {
  kind: "model";
  name: string;
}

export interface EnumRef {
  kind: "enum";
  name: string;
}

export type PropertyType = ScalarType | ArrayType | MapType | ModelRef | EnumRef;

export interface FieldDef {
  name: string;
  type: PropertyType;
  optional?: boolean;
  doc?: string;
}

export interface ModelDef {
  kind: "model";
  name: string;
  doc?: string;
  fields: FieldDef[];
}

export interface EnumMemberDef {
  name: string;
  value?: string | number;
  doc?: string;
}

export interface EnumDef {
  kind: "enum";
  name: string;
  doc?: string;
  members: EnumMemberDef[];
}

export type TypeDef = ModelDef | EnumDef;
