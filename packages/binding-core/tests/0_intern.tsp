@Entity.intern scalar Symbol extends string;
@Entity.intern scalar Path extends string;
scalar Derived extends Symbol;

model Link {
  @Entity.pk id: integer;
  @Entity.unique(Link.caller, Link.callee)
  caller: Symbol;
  @Entity.index(Link.callee)
  callee: Symbol;
  label: string | null;
  path: Path | null;
  `alias`?: Derived;
}

model Pair {
  @Entity.pk key: int64;
  @Entity.unique(Pair.left, Pair.right)
  left: Symbol;
  right: Symbol;
}

model Bare { value: Symbol; }

model Scope { @Entity.pk id: integer; name: string; }
model Scoped {
  @Entity.pk id: integer;
  @Rel.belongsTo scope: Scope;
  @Entity.unique(Scoped.scope, Scoped.name)
  name: Symbol;
}

model Names { conn: Symbol; tx: string; inserted: string; `type`: string; }
