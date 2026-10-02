import { Output, createScope, refkey, render, Scope } from "@alloy-js/core";
import { expect, it } from "vitest";
import { CScope } from "./1_scope.js";
import { SourceFile } from "./3_SourceFile.js";
import { TypeDefinition } from "../gen/0_nodes.js";

it("resolves a later declaration and generates its header include", () => {
  const key = refkey();
  const tree = render(<Output><Scope value={createScope(CScope, "c")}>
    <SourceFile path="Use_auto.h"><TypeDefinition declarator="Use" type={key} /></SourceFile>
    <SourceFile path="Id_auto.h"><TypeDefinition declarator="Id" type="int64_t" refkey={key} /></SourceFile>
  </Scope></Output>);
  expect(tree).toMatchSnapshot();
});
