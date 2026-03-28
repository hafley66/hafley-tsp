// TargetLang: the interface every emit target implements.
// TType is the target's representation of a type expression.
// TDecl is the target's representation of a complete declaration.

export interface MappedField<TType> {
  name: string;
  type: TType;
  optional: boolean;
  doc?: string;
}

export interface MappedMember {
  name: string;
  value?: string | number;
  doc?: string;
}

export interface TargetLang<TType = string, TDecl = string> {
  // ── Naming ──
  typeName(name: string): string;
  fieldName(name: string): string;
  memberName(name: string): string;

  // ── Type mapping ──
  scalar(name: string): TType;
  optional(inner: TType): TType;
  array(inner: TType): TType;
  map(key: TType, value: TType): TType;
  ref(name: string): TType;

  // ── Declaration rendering ──
  model(name: string, fields: MappedField<TType>[], doc?: string): TDecl;
  enum(name: string, members: MappedMember[], doc?: string): TDecl;
}
