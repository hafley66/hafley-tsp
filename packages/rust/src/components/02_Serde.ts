// Serde attribute builders.
// These convert typed config objects into serde(...) attr strings
// that feed into the existing Attributes component.

export interface SerdeContainerConfig {
  tag?: string;
  content?: string;
  untagged?: boolean;
  denyUnknownFields?: boolean;
  default?: boolean;
  transparent?: boolean;
}

export interface SerdeFieldConfig {
  skip?: boolean;
  skipSerializing?: boolean;
  skipDeserializing?: boolean;
  skipSerializingIf?: string;
  default?: boolean | string;
  flatten?: boolean;
  with?: string;
  alias?: string;
}

function q(s: string): string {
  return `"${s}"`;
}

export function serdeContainerAttr(config: SerdeContainerConfig): string | null {
  const parts: string[] = [];
  if (config.tag) parts.push(`tag = ${q(config.tag)}`);
  if (config.content) parts.push(`content = ${q(config.content)}`);
  if (config.untagged) parts.push("untagged");
  if (config.denyUnknownFields) parts.push("deny_unknown_fields");
  if (config.default) parts.push("default");
  if (config.transparent) parts.push("transparent");
  if (parts.length === 0) return null;
  return `serde(${parts.join(", ")})`;
}

export function serdeFieldAttr(config: SerdeFieldConfig): string | null {
  const parts: string[] = [];
  if (config.skip) parts.push("skip");
  if (config.skipSerializing) parts.push("skip_serializing");
  if (config.skipDeserializing) parts.push("skip_deserializing");
  if (config.skipSerializingIf) parts.push(`skip_serializing_if = ${q(config.skipSerializingIf)}`);
  if (config.default === true) parts.push("default");
  if (typeof config.default === "string") parts.push(`default = ${q(config.default)}`);
  if (config.flatten) parts.push("flatten");
  if (config.with) parts.push(`with = ${q(config.with)}`);
  if (config.alias) parts.push(`alias = ${q(config.alias)}`);
  if (parts.length === 0) return null;
  return `serde(${parts.join(", ")})`;
}
