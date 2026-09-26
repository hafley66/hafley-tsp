namespace Ryi;

scalar path extends string;

model Inputs {
  /** Keep files matching GLOB under each directory input; repeatable */
  pattern?: string[];

  /** Run on the files FILE reaches over imports (universe: the PATH inputs, else FILE's project) */
  entry?: path[];

  /** Import hops from --entry */
  depth?: uint32;

  /** Corpus root */
  root?: path;
}

enum TypeEdgeKind {
  Field: "field",
  Variant: "variant",
  Impl: "impl",
  Generic: "generic",
  Param: "param",
  Returns: "returns",
  Uses: "uses",
  DocRef: "doc_ref",
}

model TypeEdge {
  owner_path: path;
  owner_name?: string;
  owner_start: uint32;
  owner_end: uint32;
  target_path: path;
  target_name?: string;
  kind: TypeEdgeKind;
  resolution_origin: string;
}

model CallEdge {
  caller_path: path;
  caller_site_start: uint32;
  callee_path: path;
  callee_start: uint32;
  callee_end: uint32;
  resolution_origin: string;
}

model FactSummary {
  rows: uint64;
  tables: uint32;
}

model EditPlan {
  files: path[];
  edits: uint32;
  committed: boolean;
}
