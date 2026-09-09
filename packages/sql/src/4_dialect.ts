export interface SqlDialect {
  readonly name: string;
  readonly exactTextType: string;
  quoteIdentifier(name: string): string;
  scalarType(type: string): string;
  identityColumn(type: string, autoIncrement: boolean): string;
  placeholder(index: number): string;
  conflictClause(columns: string[], updateColumns: string[]): string;
  returningClause(column: string): string;
  nullSafeEquals(column: string, placeholder: string): string;
}

const SQLITE_TYPES: Record<string, string> = {
  string: "TEXT", integer: "INTEGER", int8: "INTEGER", int16: "INTEGER", int32: "INTEGER", int64: "INTEGER",
  uint8: "INTEGER", uint16: "INTEGER", uint32: "INTEGER", uint64: "INTEGER", float: "REAL", float32: "REAL",
  float64: "REAL", numeric: "NUMERIC", boolean: "INTEGER", bytes: "BLOB", plainDate: "TEXT", plainTime: "TEXT",
  utcDateTime: "TEXT", offsetDateTime: "TEXT", duration: "TEXT", url: "TEXT",
};

export const sqliteDialect: SqlDialect = {
  name: "sqlite",
  exactTextType: "TEXT",
  quoteIdentifier: (name) => `"${name.replaceAll('"', '""')}"`,
  scalarType: (type) => SQLITE_TYPES[type] ?? "TEXT",
  identityColumn(type, autoIncrement) {
    return `${this.scalarType(type)} PRIMARY KEY${autoIncrement && this.scalarType(type) === "INTEGER" ? " AUTOINCREMENT" : ""}`;
  },
  placeholder: () => "?",
  conflictClause(columns, updateColumns) {
    if (!columns.length) return "";
    const conflict = columns.map((column) => this.quoteIdentifier(column)).join(", ");
    if (!updateColumns.length) return ` ON CONFLICT (${conflict}) DO NOTHING`;
    return ` ON CONFLICT (${conflict}) DO UPDATE SET ${updateColumns.map((column) => `${this.quoteIdentifier(column)} = excluded.${this.quoteIdentifier(column)}`).join(", ")}`;
  },
  returningClause(column) { return ` RETURNING ${this.quoteIdentifier(column)}`; },
  nullSafeEquals(column, placeholder) { return `${this.quoteIdentifier(column)} IS ${placeholder}`; },
};
