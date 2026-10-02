import { Output, Scope, createScope, render, type Children } from "@alloy-js/core";
import { type Program, type UnionVariant } from "@typespec/compiler";
import { createCNamePolicy } from "../c/0_name-policy.js";
import { CScope } from "../c/1_scope.js";
import { SourceFile } from "../c/3_SourceFile.js";
import { EnumSpecifier, Enumerator, EnumeratorList, FieldDeclaration, FieldDeclarationList, FieldIdentifier, FunctionDeclarator, ParameterDeclaration, ParameterList, ParenthesizedDeclarator, PointerDeclarator, StructSpecifier, TypeDefinition } from "../gen/0_nodes.js";
import { declarations, pathOf, type Declaration } from "./0_types.js";
import { copyValue, fieldsOf, keyOf, typeOf } from "./1_type_map.js";

export interface CFile { path: string; contents: string; }
const line = (children: Children) => <>{children}<hbr /></>;
function string(s: string): string {
  return '"' + [...Buffer.from(s)].map(b => b === 34 ? '\\"' : b === 92 ? '\\\\' : b < 32 || b > 126 ? '\\' + b.toString(8).padStart(3,'0') : String.fromCharCode(b)).join('') + '"';
}
const isNull = (v: UnionVariant) => v.type.kind === "Intrinsic" && v.type.name === "null";

function enumDecl(name: string, members: { name: string; value?: number }[]): Children {
  return <TypeDefinition declarator={name} type={<EnumSpecifier name={name} body={<EnumeratorList>
    {members.map(m => <Enumerator name={`${name}_${m.name}`} value={m.value === undefined ? undefined : String(m.value)} />)}
  </EnumeratorList>} />} />;
}
function structDecl(type: Declaration, fields: Children[]): Children {
  return <><StructSpecifier name={<>{type.name}</>} body={<FieldDeclarationList>{fields.length ? fields : <FieldDeclaration type="unsigned char" declarator="_empty" />}</FieldDeclarationList>} />;</>;
}
function variants(type: Extract<Declaration, { kind: "Union" }>): UnionVariant[] {
  return [...type.variants.values()].map(v => {
    if (typeof v.name !== "string") throw new Error(`Union ${type.name} requires named variants`);
    return v;
  });
}

function header(program: Program, type: Declaration): Children {
  const name = type.name;
  switch (type.kind) {
    case "Scalar":
      if (!type.baseScalar) throw new Error(`Scalar ${name} needs a base scalar`);
      return line(<TypeDefinition declarator={name} refkey={keyOf(type)} type={typeOf(program, type.baseScalar)} />);
    case "Enum": {
      const members = [...type.members.values()];
      if (!members.length) throw new Error(`Empty enum: ${name}`);
      return <>
        <TypeDefinition declarator={name} refkey={keyOf(type)} type={<EnumSpecifier name={name} body={<EnumeratorList>{members.map(m => <Enumerator name={`${name}_${m.name}`} value={typeof m.value === "number" ? String(m.value) : undefined} />)}</EnumeratorList>} />} /><hbr />
        const char *{name}_to_string({name} value);<hbr />
        {name} *{name}_from_string(mi_heap_t *arena, const char *text);<hbr />
        typedef struct {name}_cases {"{"}<hbr />
        {members.map(m => line(`  void (*${m.name})(void *context);`))}
        {"}"} {name}_cases;<hbr />
        {line(`#define ${name}_cases_init(${members.map(m => m.name).join(", ")}) ((${name}_cases){ ${members.map(m => m.name).join(", ")} })`)}
        void {name}_match({name} value, void *context, const {name}_cases *cases);<hbr />
      </>;
    }
    case "Model": {
      if (type.indexer) throw new Error(`Unsupported indexed model: ${name}`);
      const fields = fieldsOf(type).flatMap(p => [
        ...(p.optional ? [<FieldDeclaration type="bool" declarator={`has_${p.name}`} />] : []),
        <FieldDeclaration type={typeOf(program, p.type)} declarator={p.name} />,
      ]);
      return <><StructSpecifier name={<>{name}</>} body={<FieldDeclarationList>{fields.length ? fields : <FieldDeclaration type="unsigned char" declarator="_empty" />}</FieldDeclarationList>} />;<hbr />{name} *{name}_create(mi_heap_t *arena, const {name} *input);<hbr /></>;
    }
    case "Union": {
      const vs = variants(type);
      if (!vs.length) throw new Error(`Empty union: ${name}`);
      return <>
        {enumDecl(`${name}_tag`, vs.map(v => ({ name: v.name as string })))}<hbr />
        typedef union {name}_value {"{"}<hbr />
        {vs.map(v => line(<>{"  "}{isNull(v) ? "unsigned char" : typeOf(program, v.type)} {v.name as string};</>))}
        {"}"} {name}_value;<hbr />
        {structDecl(type, [<FieldDeclaration type={`${name}_tag`} declarator="tag" />, <FieldDeclaration type={`${name}_value`} declarator="value" />])}<hbr />
        const char *{name}_tag_to_string({name}_tag tag);<hbr />
        {name} *{name}_parse(mi_heap_t *arena, const char *tag, const {name}_value *value);<hbr />
        {name} *{name}_create(mi_heap_t *arena, const {name} *input);<hbr />
        {vs.map(v => line(<>{name} *{name}_create_{v.name as string}(mi_heap_t *arena{isNull(v) ? "" : <>, {typeOf(program, v.type)} value</>});</>))}
        typedef struct {name}_cases {"{"}<hbr />
        {vs.map(v => line(<>{"  void (*"}{v.name as string}{")(void *context"}{isNull(v) ? "" : <>, {typeOf(program, v.type)} value</>}{");"}</>))}
        {"}"} {name}_cases;<hbr />
        {line(`#define ${name}_cases_init(${vs.map(v => v.name as string).join(", ")}) ((${name}_cases){ ${vs.map(v => v.name as string).join(", ")} })`)}
        void {name}_match(const {name} *input, void *context, const {name}_cases *cases);<hbr />
      </>;
    }
    case "Interface": {
      return <>{structDecl(type, [...type.operations.values()].map(op => <FieldDeclaration type={typeOf(program, op.returnType)} declarator={
        <FunctionDeclarator declarator={<ParenthesizedDeclarator><PointerDeclarator declarator={<FieldIdentifier>{op.name}</FieldIdentifier>} /></ParenthesizedDeclarator>} parameters={<ParameterList>
          {[
            <ParameterDeclaration type="void *" declarator="self" />,
            <ParameterDeclaration type="mi_heap_t *" declarator="arena" />,
            ...[...op.parameters.properties.values()].map(p => {
              if (p.optional) throw new Error(`Optional interface parameter: ${name}.${op.name}.${p.name}`);
              return <ParameterDeclaration type={typeOf(program, p.type)} declarator={p.name} />;
            }),
          ]}
        </ParameterList>} />
      } />))}<hbr />{name} {name}_create(mi_heap_t *arena, const {name} *input);<hbr /></>;
    }
  }
}
function implementation(program: Program, type: Declaration): Children {
  const name = type.name;
  switch (type.kind) {
    case "Scalar": return "";
    case "Enum": {
      const members = [...type.members.values()];
      const table = members.map(m => `  { ${name}_${m.name}, ${string(String(m.value ?? m.name))} },\n`).join("");
      return `static const struct { ${name} value; const char *text; } ${name}_strings[] = {\n${table}};\n\nconst char *${name}_to_string(${name} value) {\n  for (size_t i = 0; i < sizeof(${name}_strings) / sizeof(${name}_strings[0]); ++i) {\n    if (${name}_strings[i].value == value) return ${name}_strings[i].text;\n  }\n  return NULL;\n}\n\n${name} *${name}_from_string(mi_heap_t *arena, const char *text) {\n  if (!arena || !text) return NULL;\n  for (size_t i = 0; i < sizeof(${name}_strings) / sizeof(${name}_strings[0]); ++i) {\n    if (strcmp(${name}_strings[i].text, text) == 0) {\n      ${name} *out = mi_heap_malloc(arena, sizeof(*out));\n      if (out) *out = ${name}_strings[i].value;\n      return out;\n    }\n  }\n  return NULL;\n}\n\nvoid ${name}_match(${name} value, void *context, const ${name}_cases *cases) {\n  switch (value) {\n${members.map(m => `    case ${name}_${m.name}: cases->${m.name}(context); return;\n`).join("")}  }\n}\n`;
    }
    case "Model": {
      const fields = fieldsOf(type);
      return <>{name} *{name}_create(mi_heap_t *arena, const {name} *input) {"{"}<hbr />
        {"  if (!arena || !input) return NULL;"}<hbr />
        {`  ${name} *out = mi_heap_zalloc(arena, sizeof(*out));`}<hbr />
        {"  if (!out) return NULL;"}<hbr />
        {fields.map(p => <>
          {p.optional && line(`  out->has_${p.name} = input->has_${p.name};`)}
          {"  "}{p.optional ? `if (input->has_${p.name}) ` : ""}out-&gt;{p.name} = {copyValue(p.type, `input->${p.name}`)};<hbr />
        </>)}
        {"  return out;"}<hbr />{"}"}<hbr />
      </>;
    }
    case "Interface": return `${name} ${name}_create(mi_heap_t *arena, const ${name} *input) {\n  (void)arena;\n  return input ? *input : (${name}){0};\n}\n`;
    case "Union": {
      const vs = variants(type);
      return <>
        {`const char *${name}_tag_to_string(${name}_tag tag) {\n  switch (tag) {\n${vs.map(v => `    case ${name}_tag_${v.name as string}: return ${string(v.name as string)};\n`).join("")}  }\n  return NULL;\n}\n\n`}
        {name} *{name}_create(mi_heap_t *arena, const {name} *input) {"{"}<hbr />
        {"  if (!arena || !input) return NULL;"}<hbr />
        {`  ${name} *out = mi_heap_zalloc(arena, sizeof(*out));`}<hbr />
        {"  if (!out) return NULL;"}<hbr />
        {"  out->tag = input->tag;"}<hbr />
        {"  switch (input->tag) {"}<hbr />
        {vs.map(v => line(<>    case {name}_tag_{v.name as string}: out-&gt;value.{v.name as string} = {isNull(v) ? "0" : copyValue(v.type, `input->value.${v.name as string}`)}; break;</>))}
        {"    default: return NULL;"}<hbr />{"  }"}<hbr />{"  return out;"}<hbr />{"}"}<hbr /><hbr />
        {name} *{name}_parse(mi_heap_t *arena, const char *tag, const {name}_value *value) {"{"}<hbr />
        {"  if (!arena || !tag || !value) return NULL;"}<hbr />
        {`  ${name} input = {0};`}<hbr />
        {vs.map((v,i) => line(`  ${i ? "else " : ""}if (strcmp(tag, ${string(v.name as string)}) == 0) input.tag = ${name}_tag_${v.name as string};`))}
        {"  else return NULL;"}<hbr />
        {"  input.value = *value;"}<hbr />
        {`  return ${name}_create(arena, &input);`}<hbr />{"}"}<hbr /><hbr />
        {vs.map(v => <>
          {name} *{name}_create_{v.name as string}(mi_heap_t *arena{isNull(v) ? "" : <>, {typeOf(program,v.type)} value</>}) {"{"}<hbr />
          {`  ${name}_value payload = { .${v.name as string} = ${isNull(v) ? "0" : "value"} };`}<hbr />
          {`  return ${name}_parse(arena, ${string(v.name as string)}, &payload);`}<hbr />{"}"}<hbr /><hbr />
        </>)}
        {`void ${name}_match(const ${name} *input, void *context, const ${name}_cases *cases) {\n  switch (input->tag) {\n${vs.map(v => `    case ${name}_tag_${v.name as string}: cases->${v.name as string}(context${isNull(v) ? "" : `, input->value.${v.name as string}`}); return;\n`).join("")}  }\n}\n`}
      </>;
    }
  }
}

export function emitC(program: Program): CFile[] {
  const types = declarations(program);
  const policy = createCNamePolicy();
  for (const type of types) {
    policy.getName(type.name!, "type_definition");
    const names = type.kind === "Model" ? fieldsOf(type).map(p => p.name) : type.kind === "Enum" ? [...type.members.keys()] : type.kind === "Union" ? variants(type).map(v => v.name as string) : type.kind === "Interface" ? [...type.operations.keys()] : [];
    for (const name of names) policy.getName(name, "field_declaration");
  }
  const tree = render(<Output><Scope value={createScope(CScope, "c", undefined)}>
    {types.flatMap(type => {
      const path = pathOf(type);
      return [
        <SourceFile path={`${path}_auto.h`} preamble={<>
          {"#pragma once\n#include <stdbool.h>\n#include <stddef.h>\n#include <stdint.h>\n#include <mimalloc.h>\n\n"}
          {(type.kind === "Model" || type.kind === "Union" || type.kind === "Interface") && line(<TypeDefinition declarator={type.name} refkey={keyOf(type)} type={<StructSpecifier name={type.name} />} />)}
        </>}>
          {header(program,type)}
        </SourceFile>,
        <SourceFile path={`${path}_auto.c`}>
          {`#include "${type.name}_auto.h"\n#include <string.h>\n\n`}
          {implementation(program,type)}
        </SourceFile>,
      ];
    })}
  </Scope></Output>);
  const files: CFile[] = [];
  function walk(node: typeof tree) {
    for (const item of node.contents) {
      if (item.kind === "directory") walk(item);
      else if ("contents" in item) {
        if (item.contents.includes("<Unresolved")) throw new Error(`Unresolved reference in ${item.path}`);
        files.push({path:item.path,contents:item.contents.endsWith("\n") ? item.contents : item.contents + "\n"});
      }
    }
  }
  walk(tree);
  return files;
}
