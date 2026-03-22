// Input schema for the emitter. Plain data in, Rust components out.
// These types describe models at a language-neutral level.
// A TypeSpec adapter would map TypeSpec AST nodes to these.

export interface ModelProperty {
  name: string;
  type: ScalarType | ArrayType | MapType | ModelRef | EnumRef;
  optional?: boolean;
  doc?: string;
}

export interface ScalarType {
  kind: "scalar";
  name: string; // "string", "int32", "int64", "float32", "float64", "boolean", "bytes", "utcDateTime"
}

export interface ArrayType {
  kind: "array";
  element: ModelProperty["type"];
}

export interface MapType {
  kind: "map";
  key: ScalarType;
  value: ModelProperty["type"];
}

export interface ModelRef {
  kind: "model";
  name: string;
}

export interface EnumRef {
  kind: "enum";
  name: string;
}

export interface ModelDef {
  kind: "model";
  name: string;
  doc?: string;
  properties: ModelProperty[];
}

export interface EnumMember {
  name: string;
  value?: string | number;
  doc?: string;
}

export interface EnumDef {
  kind: "enum";
  name: string;
  doc?: string;
  members: EnumMember[];
}

export type TypeDef = ModelDef | EnumDef;
