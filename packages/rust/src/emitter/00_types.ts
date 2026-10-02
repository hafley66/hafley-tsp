// Input schema for the emitter. Plain data in, Rust components out.
// These types describe models at a language-neutral level.
// A TypeSpec adapter would map TypeSpec AST nodes to these.

export type ParamValue = string | number | boolean;

export interface ModelProperty {
  name: string;
  type: ScalarType | ArrayType | MapType | ModelRef | EnumRef;
  optional?: boolean;
  doc?: string;
  default?: ParamValue;
  cli?: {
    long?: string;
    short?: string;
    valueName?: string;
    requires?: string;
    requiresAll?: string[];
    conflictsWith?: string[];
    valueDelimiter?: string;
    positional?: boolean;
    skip?: boolean;
    hidden?: boolean;
    global?: boolean;
    minValue?: number;
    maxValue?: number;
    required?: boolean;
  };
}

export interface ScalarType {
  kind: "scalar";
  name: string; // "string", "int32", "int64", "float32", "float64", "boolean", "bytes", "utcDateTime"
  alias?: string; // user-declared scalar name, e.g. `scalar path extends string` -> "path"
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
  requiredOneOf?: string[];
  requiredOneOfName?: string;
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

// Operations: the single source both transports (clap, axum) project from.
// Param and return types reference TypeDefs by name; the ops never define models.

export type ParamSource = "path" | "query" | "header" | "body";

export interface OperationParam extends ModelProperty {
  source: ParamSource;
  headerName?: string;
  stream?: boolean; // HttpStream<T> body: `type` is the item T
  streamFormat?: "jsonl" | "raw";
  streamContentType?: string;
}

export type HttpVerb = "get" | "post" | "put" | "patch" | "delete" | "head";

export interface OperationDef {
  name: string;
  hidden?: boolean;
  argsConflictsWithSubcommands?: boolean;
  subcommandRequired?: boolean;
  doc?: string;
  afterHelp?: string;
  requiredOneOf?: string[];
  requiredOneOfName?: string;
  verb: HttpVerb;
  path: string;
  params: OperationParam[];
  returns?: ModelProperty["type"];
  returnsStream?: boolean; // JsonlStream<T> response: `returns` is the item T
}

export interface ServiceDef {
  name: string;
  doc?: string;
  daemon?: { idleSecs: number; handshake: boolean; serverBin?: string };
  rootArgs?: string;
  afterHelp?: string;
  argsConflictsWithSubcommands?: boolean;
  operations: OperationDef[];
}
